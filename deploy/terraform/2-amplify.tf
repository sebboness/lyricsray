# IAM role for Amplify
resource "aws_iam_role" "amplify_role" {
  name = "${local.app}-amplify-role-${local.env}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "amplify.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "amplify_policy" {
  name = "${local.app}-amplify-policy-${local.env}"
  role = aws_iam_role.amplify_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = [
          "arn:aws:logs:*:*:*",
          aws_cloudwatch_log_group.amplify_app_logs.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = data.aws_secretsmanager_secret.secrets.arn
      }
    ]
  })

  depends_on = [
    aws_iam_role.amplify_role,
    aws_cloudwatch_log_group.amplify_app_logs,
    aws_cloudwatch_log_group.amplify_ssr_logs
  ]
}

# Amplify App
resource "aws_amplify_app" "lyricsray" {
  name        = "${local.app}-${local.env}"
  repository  = "https://github.com/sebboness/lyricsray.git"
  access_token = local.ssm_secrets.GITHUB_ACCESS_TOKEN
  
  # Build settings
  build_spec = file("${path.module}/amplify/buildspec_${local.env}.yml")
  
  # Environment variables from Secrets Manager
  environment_variables = {
    AMPLIFY_MONOREPO_APP_ROOT = "web"
    AMPLIFY_DIFF_DEPLOY       = "false"
    ENV                       = local.env
    # Force Next.js to use App Router consistently
    NEXT_CONFIG_OUTPUT        = "standalone"
    _LIVE_UPDATES             = jsonencode([
      {
        name    = "Node.js version"
        pkg     = "next-version"
        type    = "internal"
        version = "15.3.5"
      },
      {
        name    = "Node.js version"
        pkg     = "node"
        type    = "nvm"
        version = "20"
      }
    ])
  }

  # Custom rules for SPA routing
  custom_rule {
    source = "/<*>"
    status = "404-200"
    target = "/index.html"
  }

  # API routes
  custom_rule {
    source = "/api/<*>"
    status = "200"
    target = "/api/<*>"
  }

  # Enable auto branch creation for feature branches in dev
  enable_auto_branch_creation = false
  enable_branch_auto_build    = false
  enable_branch_auto_deletion = false

  # Platform for Next.js
  platform = "WEB_COMPUTE"
  
  iam_service_role_arn = aws_iam_role.amplify_role.arn

  tags = {
    app = local.app
    env = local.env
  }
}

# CloudWatch Log Group for Amplify SSR logs
resource "aws_cloudwatch_log_group" "amplify_ssr_logs" {
  name              = "/aws/amplify/apps/${local.app}/${local.env}"
  retention_in_days = 14
  
  tags = {
    app = local.app
    env = local.env
  }
}

# Also create a general app log group
resource "aws_cloudwatch_log_group" "amplify_app_logs" {
  name              = "/aws/amplify/${local.app}/${local.env}"
  retention_in_days = 14
  
  tags = {
    app = local.app
    env = local.env
  }
}

# Main branch (prod) or development branch (dev)
resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.lyricsray.id
  branch_name = local.env == "prod" ? "main" : "dev"
  
  framework = "Next.js - SSR"
  stage     = local.env == "prod" ? "PRODUCTION" : "DEVELOPMENT"

  environment_variables = merge(
    {
      ENVIRONMENT           = local.env
      NEXT_PUBLIC_ENV       = local.env
      NODE_ENV              = local.env == "prod" ? "production" : "development"
      LOG_LEVEL             = local.env == "prod" ? "info" : "debug"
      NEXT_LOG_LEVEL        = "debug"
    },
    # Add secret environment variables
    {
      APP_NAME          = local.ssm_secrets.APP_NAME
      APP_URL           = local.ssm_secrets.APP_URL
      APP_VERSION       = local.ssm_secrets.APP_VERSION
      ANTHROPIC_API_KEY = local.ssm_secrets.ANTHROPIC_API_KEY
      ANTHROPIC_MODEL   = local.ssm_secrets.ANTHROPIC_MODEL
    }
  )

  # Enable basic auth for dev environment
  enable_basic_auth = false
}

# Custom domain for production
resource "aws_amplify_domain_association" "lyricsray_prod_domain" {
  count       = local.env == "prod" ? 1 : 0
  app_id      = aws_amplify_app.lyricsray.id
  domain_name = "lyricsray.com"

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = ""
  }

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "www"
  }

  wait_for_verification = false
}

# Custom domain for development
resource "aws_amplify_domain_association" "lyricsray_dev_domain" {
  count       = local.env == "dev" ? 1 : 0
  app_id      = aws_amplify_app.lyricsray.id
  domain_name = "lyricsray.hexonite.net"

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = ""
  }

  wait_for_verification = false
}

# Webhook for automated deployments (optional)
resource "aws_amplify_webhook" "lyricsray_webhook" {
  app_id      = aws_amplify_app.lyricsray.id
  branch_name = aws_amplify_branch.main.branch_name
  description = "Webhook for ${local.env} deployments"
}

# Outputs
output "amplify_app_id" {
  description = "Amplify App ID"
  value       = aws_amplify_app.lyricsray.id
}

output "amplify_default_domain" {
  description = "Amplify default domain"
  value       = "https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.lyricsray.default_domain}"
}

output "amplify_webhook_url" {
  description = "Amplify webhook URL for deployments"
  value       = aws_amplify_webhook.lyricsray_webhook.url
  sensitive   = true
}

output "custom_domain_url" {
  description = "Custom domain URL"
  value       = local.env == "prod" ? "https://lyricsray.com" : "https://lyricsray.hexonite.net"
}

output "amplify_domain_verification_record" {
  description = "Domain verification record for custom domain"
  value = local.env == "prod" ? (
    length(aws_amplify_domain_association.lyricsray_prod_domain) > 0 ? 
    aws_amplify_domain_association.lyricsray_prod_domain[0].certificate_verification_dns_record : null
  ) : (
    length(aws_amplify_domain_association.lyricsray_dev_domain) > 0 ? 
    aws_amplify_domain_association.lyricsray_dev_domain[0].certificate_verification_dns_record : null
  )
}