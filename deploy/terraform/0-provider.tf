terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.3.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.2.0"
    }
  }

  required_version = "~> 1.12.2"

  backend "s3" {
    bucket  = "hexonite-lyricsray-infra"
    key     = "terraform"
    region  = "us-west-2"
    encrypt = true
  }
}

locals {
  app = "lyricsray"
  env = terraform.workspace == "default" ? "dev" : terraform.workspace
}

provider "aws" {
  region = "us-west-2"
  default_tags {
    tags = {
        app = local.app
        env = local.env
    }
  }
}