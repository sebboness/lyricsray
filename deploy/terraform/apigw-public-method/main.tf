resource "aws_api_gateway_method" "method" {
  rest_api_id   = var.rest_api_id
  resource_id   = var.resource_id
  http_method   = var.http_method
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "integration" {
  rest_api_id             = var.rest_api_id
  resource_id             = var.resource_id
  http_method             = aws_api_gateway_method.method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arn
  depends_on              = [aws_api_gateway_method.method]
}

resource "aws_api_gateway_method_response" "response" {
  rest_api_id = var.rest_api_id
  resource_id = var.resource_id
  http_method = aws_api_gateway_method.method.http_method
  status_code = "200"
  depends_on  = [aws_api_gateway_method.method]
}

resource "aws_api_gateway_integration_response" "integration_response" {
  rest_api_id = var.rest_api_id
  resource_id = var.resource_id
  http_method = aws_api_gateway_method.method.http_method
  status_code = aws_api_gateway_method_response.response.status_code
  depends_on  = [
    aws_api_gateway_method.method,
    aws_api_gateway_method_response.response,
    aws_api_gateway_integration.integration,
  ]
}

module "options" {
  source            = "../apigw-options"
  rest_api_id       = var.rest_api_id
  resource_id       = var.resource_id
  lambda_invoke_arn = var.lambda_invoke_arn
}
