resource "aws_iam_role" "lambda_exec" {
  name = "${local.app}-${local.env}-main-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_policy" "policy" {
  name        = "${local.app}-${local.env}-main-lambda-policy"
  description = "${local.app} ${local.env} main lambda policy"
  policy = jsonencode(
    {
      "Version" : "2012-10-17",
      "Statement" : [
        {
          "Effect" : "Allow",
          "Action" : [
            "dynamodb:BatchGetItem",
            "dynamodb:BatchWriteItem",
            "dynamodb:DeleteItem",
            "dynamodb:GetItem",
            "dynamodb:PutItem",
            "dynamodb:Query",
            "dynamodb:TransactWriteItems",
            "dynamodb:UpdateItem",
            "logs:*"
          ],
          "Resource" : [
            "arn:aws:dynamodb:*:*:table/${local.app}-${local.env}-analysis-rate-limits",
            "arn:aws:dynamodb:*:*:table/${local.app}-${local.env}-analysis-results",
            "arn:aws:dynamodb:*:*:table/${local.app}-${local.env}-analysis-results/index/*",
          ]
        },
        {
          "Effect" : "Allow",
          "Action" : [
            "cognito-idp:InitiateAuth",
            "cognito-idp:RespondToAuthChallenge"
          ],
          "Resource" : "arn:aws:cognito-idp:*:*:userpool/*"
        }
      ]
    }
  )
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.policy.arn
}

locals {
  lambda_zip  = "${path.module}/../../api/lambda.zip"
  api_version = jsondecode(file("${path.module}/../../api/package.json")).version
}

resource "aws_lambda_function" "main" {
  function_name = "${local.app}-${local.env}-main"

  s3_bucket = aws_s3_bucket.lambda_bucket.id
  s3_key    = aws_s3_object.lambda_main.key

  package_type  = "Zip"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  architectures = ["x86_64"]
  timeout       = 28
  memory_size   = 512

  source_code_hash = filebase64sha256(local.lambda_zip)

  role = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      APP_NAME          = local.app
      APP_URL           = local.ssm_secrets["APP_URL"]
      APP_VERSION       = local.ssm_secrets["APP_VERSION"]
      BUILT_AT          = timestamp()
      ENV               = local.env
      VERSION           = local.api_version
      LOG_LEVEL         = local.env == "prod" ? "info" : "debug"

      ANTHROPIC_API_KEY = local.ssm_secrets["ANTHROPIC_API_KEY"]
      ANTHROPIC_MODEL   = local.ssm_secrets["ANTHROPIC_MODEL"]
      ALTCHA_SECRET     = local.ssm_secrets["ALTCHA_SECRET"]

      # Admin authentication — single Cognito admin user, manually provisioned (see CLAUDE.md).
      # No API Gateway authorizer: the Lambda verifies the id token itself (api/src/auth/verifyJwt.ts).
      COGNITO_USER_POOL_ID  = local.ssm_secrets["COGNITO_USER_POOL_ID"]
      COGNITO_CLIENT_ID     = local.ssm_secrets["COGNITO_CLIENT_ID"]
      COGNITO_CLIENT_SECRET = local.ssm_secrets["COGNITO_CLIENT_SECRET"]

      APP_FREE_TIER_GLOBAL_DAILY_LIMIT   = local.ssm_secrets["APP_FREE_TIER_GLOBAL_DAILY_LIMIT"]
      APP_FREE_TIER_HOURLY_LIMIT         = local.ssm_secrets["APP_FREE_TIER_HOURLY_LIMIT"]
      APP_FREE_TIER_DAILY_LIMIT          = local.ssm_secrets["APP_FREE_TIER_DAILY_LIMIT"]
      APP_FREE_TIER_BURST_LIMIT          = local.ssm_secrets["APP_FREE_TIER_BURST_LIMIT"]
      APP_FREE_TIER_BURST_WINDOW_MINUTES = local.ssm_secrets["APP_FREE_TIER_BURST_WINDOW_MINUTES"]
    }
  }
}

resource "aws_cloudwatch_log_group" "main" {
  name              = "/aws/lambda/${aws_lambda_function.main.function_name}"
  retention_in_days = 14
}

resource "aws_s3_object" "lambda_main" {
  bucket = aws_s3_bucket.lambda_bucket.id
  key    = "${local.app}-${local.env}-main.zip"
  source = local.lambda_zip
  etag   = filemd5(local.lambda_zip)
}

resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.main.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*/*"
}
