resource "aws_api_gateway_rest_api" "api" {
  name        = "${local.app}-${local.env}-api"
  description = "${local.app} ${local.env} api"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_gateway_response" "responses" {
  for_each = {
    BAD_REQUEST_BODY             = 400
    BAD_REQUEST_PARAMETERS       = 400
    DEFAULT_4XX                  = 400
    MISSING_AUTHENTICATION_TOKEN = 404
    UNAUTHORIZED                 = 401
    ACCESS_DENIED                = 403
    EXPIRED_TOKEN                = 403
    RESOURCE_NOT_FOUND           = 404
    QUOTA_EXCEEDED               = 429
    THROTTLED                    = 429
    DEFAULT_5XX                  = 500
    INTEGRATION_FAILURE          = 504
    INTEGRATION_TIMEOUT          = 504
  }
  response_type = each.key
  status_code   = each.value
  rest_api_id   = aws_api_gateway_rest_api.api.id
  response_templates = {
    "application/json" = "{\"status\":\"FAILURE\",\"errors\":[$context.error.messageString],\"message\":$context.error.messageString}"
  }
  depends_on = [
    aws_api_gateway_rest_api.api
  ]
}

# /v1
resource "aws_api_gateway_resource" "root" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "v1"
}

# /v1/health
resource "aws_api_gateway_resource" "health" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.root.id
  path_part   = "health"
  depends_on  = [aws_api_gateway_resource.root]
}

# /v1/{proxy+} — every LyricsRay route is public (no user auth, only Altcha
# CAPTCHA verification inside individual handlers), so a single ANY-method
# catch-all is sufficient. New routes added to api/index.ts need no Terraform
# change, unlike apps with a public/authenticated route split.
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.root.id
  path_part   = "{proxy+}"
  depends_on  = [aws_api_gateway_resource.root]
}

resource "aws_api_gateway_method" "proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "proxy_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.main.invoke_arn
}

resource "aws_api_gateway_method_response" "proxy_any" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy_any.http_method
  status_code = "200"
}

resource "aws_api_gateway_integration_response" "proxy_int_resp" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy_any.http_method
  status_code = aws_api_gateway_method_response.proxy_any.status_code
  depends_on = [
    aws_api_gateway_method.proxy_any,
    aws_api_gateway_integration.proxy_integration
  ]
}

# CORS preflight — only exercised for local/direct testing; production browser
# traffic goes through the Next.js BFF proxy (same-origin, no CORS needed).
module "apigw_proxy_options" {
  source            = "./apigw-options"
  rest_api_id       = aws_api_gateway_rest_api.api.id
  resource_id       = aws_api_gateway_resource.proxy.id
  lambda_invoke_arn = aws_lambda_function.main.invoke_arn
  depends_on        = [aws_api_gateway_resource.proxy]
}

# ── Public endpoints ──────────────────────────────────────────────────────────
# Each module call creates: method (NONE auth) + integration + method_response
#                           + integration_response + OPTIONS (CORS preflight).

module "apigw_health" {
  source            = "./apigw-public-method"
  rest_api_id       = aws_api_gateway_rest_api.api.id
  resource_id       = aws_api_gateway_resource.health.id
  http_method       = "GET"
  lambda_invoke_arn = aws_lambda_function.main.invoke_arn
  depends_on        = [aws_api_gateway_resource.health]
}

# ── Deployment and stage ──────────────────────────────────────────────────────

resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  # Redeployed whenever any .tf file in this module changes
  triggers = {
    redeployment = sha1(join("", [
      for f in sort(fileset(path.module, "*.tf")) : filesha1("${path.module}/${f}")
    ]))
  }
  lifecycle {
    create_before_destroy = true
  }
  depends_on = [
    aws_api_gateway_integration.proxy_integration,
    module.apigw_proxy_options,
    module.apigw_health,
  ]
}

resource "aws_api_gateway_stage" "stage" {
  deployment_id = aws_api_gateway_deployment.deployment.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = local.env
  depends_on    = [aws_api_gateway_deployment.deployment]
}
