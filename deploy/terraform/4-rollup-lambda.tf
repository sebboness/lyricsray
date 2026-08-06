locals {
  rollup_lambda_zip = "${path.module}/../../api/lambda-rollup.zip"
}

# IAM role for the rollup Lambda
resource "aws_iam_role" "rollup_lambda_exec" {
  name = "${local.app}-${local.env}-rollup-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_policy" "rollup_policy" {
  name        = "${local.app}-${local.env}-rollup-lambda-policy"
  description = "${local.app} ${local.env} rollup lambda policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Query",
        ]
        Resource = [
          "arn:aws:dynamodb:*:*:table/${local.app}-${local.env}-analytics-events",
          "arn:aws:dynamodb:*:*:table/${local.app}-${local.env}-analytics-events/index/*",
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
        ]
        Resource = [
          "arn:aws:dynamodb:*:*:table/${local.app}-${local.env}-daily-stats",
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rollup_lambda_policy" {
  role       = aws_iam_role.rollup_lambda_exec.name
  policy_arn = aws_iam_policy.rollup_policy.arn
}

# Rollup Lambda function
resource "aws_s3_object" "lambda_rollup" {
  bucket = aws_s3_bucket.lambda_bucket.id
  key    = "${local.app}-${local.env}-rollup.zip"
  source = local.rollup_lambda_zip
  etag   = filemd5(local.rollup_lambda_zip)
}

resource "aws_lambda_function" "rollup" {
  function_name = "${local.app}-${local.env}-rollup"

  s3_bucket = aws_s3_bucket.lambda_bucket.id
  s3_key    = aws_s3_object.lambda_rollup.key

  package_type  = "Zip"
  runtime       = "nodejs20.x"
  handler       = "indexRollup.handler"
  architectures = ["x86_64"]
  timeout       = 120
  memory_size   = 256

  source_code_hash = filebase64sha256(local.rollup_lambda_zip)

  role = aws_iam_role.rollup_lambda_exec.arn

  environment {
    variables = {
      APP_NAME  = local.app
      ENV       = local.env
      LOG_LEVEL = local.env == "prod" ? "info" : "debug"
    }
  }
}

resource "aws_cloudwatch_log_group" "rollup" {
  name              = "/aws/lambda/${aws_lambda_function.rollup.function_name}"
  retention_in_days = 14
}

# EventBridge Scheduler role
resource "aws_iam_role" "scheduler_exec" {
  name = "${local.app}-${local.env}-rollup-scheduler"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "scheduler_invoke" {
  name = "${local.app}-${local.env}-rollup-scheduler-policy"
  role = aws_iam_role.scheduler_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["lambda:InvokeFunction"]
      Resource = [aws_lambda_function.rollup.arn]
    }]
  })
}

# EventBridge schedule — runs every 6 hours (4x/day)
resource "aws_scheduler_schedule" "rollup" {
  name       = "${local.app}-${local.env}-rollup"
  group_name = "default"

  flexible_time_window {
    mode                      = "FLEXIBLE"
    maximum_window_in_minutes = 15
  }

  schedule_expression          = "cron(0 */6 * * ? *)"
  schedule_expression_timezone = "UTC"

  target {
    arn      = aws_lambda_function.rollup.arn
    role_arn = aws_iam_role.scheduler_exec.arn
  }
}
