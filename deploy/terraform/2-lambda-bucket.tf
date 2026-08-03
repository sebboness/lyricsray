resource "random_id" "suffix" {
  keepers = {
    env = local.env
  }

  byte_length = 8
}

resource "aws_s3_bucket" "lambda_bucket" {
  bucket        = "${replace(local.app, "_", "-")}-${local.env}-${random_id.suffix.hex}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "lambda_bucket" {
  bucket = aws_s3_bucket.lambda_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
