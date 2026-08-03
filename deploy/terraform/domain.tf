# The dev Amplify domain (lyricsray.hexonite.net, see 2-amplify.tf) is a subdomain
# of the hexonite.net hosted zone, not a hosted zone of its own — so the Route53
# lookup below must use the parent zone name for dev while the actual FQDN we
# create records under stays api.lyricsray.hexonite.net. Prod's lyricsray.com is
# a real registered domain with its own zone, so it looks itself up directly.
locals {
  apiRootDomain = local.env == "prod" ? "lyricsray.com" : "hexonite.net"
  apiFqdn       = local.env == "prod" ? "api.lyricsray.com" : "api.lyricsray.hexonite.net"
}

data "aws_route53_zone" "api" {
  name = local.apiRootDomain
}

resource "aws_acm_certificate" "api" {
  domain_name       = local.apiFqdn
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  name    = each.value.name
  records = [each.value.record]
  type    = each.value.type
  zone_id = data.aws_route53_zone.api.zone_id
  ttl     = 60

  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]
}

resource "aws_api_gateway_domain_name" "api" {
  domain_name              = local.apiFqdn
  regional_certificate_arn = aws_acm_certificate_validation.api.certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_base_path_mapping" "api" {
  api_id      = aws_api_gateway_rest_api.api.id
  stage_name  = aws_api_gateway_stage.stage.stage_name
  domain_name = aws_api_gateway_domain_name.api.domain_name
}

resource "aws_route53_record" "api" {
  name    = local.apiFqdn
  type    = "A"
  zone_id = data.aws_route53_zone.api.zone_id

  alias {
    name                   = aws_api_gateway_domain_name.api.regional_domain_name
    zone_id                = aws_api_gateway_domain_name.api.regional_zone_id
    evaluate_target_health = false
  }
}

output "api_url" {
  value = "https://${local.apiFqdn}"
}
