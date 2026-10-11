terraform {
  required_version = ">= 1.11.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.7.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project = "howly"
      Stack   = "production"
    }
  }
}

provider "aws" {
  alias  = "standby"
  region = var.standby_region

  default_tags {
    tags = {
      Project = "howly"
      Stack   = "production-standby"
    }
  }
}

provider "aws" {
  alias  = "use1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project = "howly"
      Stack   = "production"
    }
  }
}
