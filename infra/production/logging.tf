locals {
  log_lifecycle = {
    transition_days = 90
    expiration_days = 365
  }
}

resource "aws_s3_bucket" "logs" {
  bucket = "howly-logs-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket" "logs_standby" {
  provider = aws.standby
  bucket   = "howly-logs-${data.aws_caller_identity.current.account_id}-${var.standby_region}"
}

resource "aws_s3_bucket_versioning" "logs" {
  bucket = aws_s3_bucket.logs.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "logs_standby" {
  provider = aws.standby
  bucket   = aws_s3_bucket.logs_standby.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_ownership_controls" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_ownership_controls" "logs_standby" {
  provider = aws.standby
  bucket   = aws_s3_bucket.logs_standby.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "logs_standby" {
  provider = aws.standby
  bucket   = aws_s3_bucket.logs_standby.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = module.kms_primary.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs_standby" {
  provider = aws.standby
  bucket   = aws_s3_bucket.logs_standby.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = module.kms_standby.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "retain-a-year"
    status = "Enabled"

    filter {}

    transition {
      days          = local.log_lifecycle.transition_days
      storage_class = "GLACIER"
    }

    expiration {
      days = local.log_lifecycle.expiration_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "logs_standby" {
  provider = aws.standby
  bucket   = aws_s3_bucket.logs_standby.id

  rule {
    id     = "retain-a-year"
    status = "Enabled"

    filter {}

    transition {
      days          = local.log_lifecycle.transition_days
      storage_class = "GLACIER"
    }

    expiration {
      days = local.log_lifecycle.expiration_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_s3_bucket_policy" "logs" {
  bucket = aws_s3_bucket.logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "CloudTrailWrite"
        Effect    = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.logs.arn}/cloudtrail/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "aws:SourceArn" = "arn:aws:cloudtrail:${var.aws_region}:${data.aws_caller_identity.current.account_id}:trail/howly"
          }
        }
      },
      {
        Sid       = "CloudTrailAcl"
        Effect    = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action    = "s3:GetBucketAcl"
        Resource  = aws_s3_bucket.logs.arn
        Condition = {
          StringEquals = {
            "aws:SourceArn" = "arn:aws:cloudtrail:${var.aws_region}:${data.aws_caller_identity.current.account_id}:trail/howly"
          }
        }
      },
      {
        Sid       = "DeliveryWrite"
        Effect    = "Allow"
        Principal = { Service = "delivery.logs.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.logs.arn}/*"
        Condition = {
          StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        }
      },
      {
        Sid       = "DeliveryAcl"
        Effect    = "Allow"
        Principal = { Service = "delivery.logs.amazonaws.com" }
        Action    = ["s3:GetBucketAcl", "s3:ListBucket"]
        Resource  = aws_s3_bucket.logs.arn
        Condition = {
          StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        }
      },
      {
        Sid       = "AlbWrite"
        Effect    = "Allow"
        Principal = { Service = "logdelivery.elasticloadbalancing.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.logs.arn}/alb/*"
        Condition = {
          StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        }
      },
      {
        Sid       = "S3AccessLogs"
        Effect    = "Allow"
        Principal = { Service = "logging.s3.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.logs.arn}/s3/*"
        Condition = {
          StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        }
      },
      {
        Sid       = "ConfigWrite"
        Effect    = "Allow"
        Principal = { Service = "config.amazonaws.com" }
        Action    = ["s3:PutObject"]
        Resource  = "${aws_s3_bucket.logs.arn}/config/*"
        Condition = {
          StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        }
      },
      {
        Sid       = "ConfigRead"
        Effect    = "Allow"
        Principal = { Service = "config.amazonaws.com" }
        Action    = ["s3:GetBucketAcl", "s3:ListBucket"]
        Resource  = aws_s3_bucket.logs.arn
        Condition = {
          StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        }
      },
    ]
  })
}

resource "aws_s3_bucket_policy" "logs_standby" {
  provider = aws.standby
  bucket   = aws_s3_bucket.logs_standby.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DeliveryWrite"
        Effect    = "Allow"
        Principal = { Service = "delivery.logs.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.logs_standby.arn}/*"
        Condition = {
          StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        }
      },
      {
        Sid       = "DeliveryAcl"
        Effect    = "Allow"
        Principal = { Service = "delivery.logs.amazonaws.com" }
        Action    = ["s3:GetBucketAcl", "s3:ListBucket"]
        Resource  = aws_s3_bucket.logs_standby.arn
        Condition = {
          StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        }
      },
      {
        Sid       = "AlbWrite"
        Effect    = "Allow"
        Principal = { Service = "logdelivery.elasticloadbalancing.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.logs_standby.arn}/alb/*"
        Condition = {
          StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        }
      },
      {
        Sid       = "ConfigWrite"
        Effect    = "Allow"
        Principal = { Service = "config.amazonaws.com" }
        Action    = ["s3:PutObject"]
        Resource  = "${aws_s3_bucket.logs_standby.arn}/config/*"
        Condition = {
          StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        }
      },
      {
        Sid       = "ConfigRead"
        Effect    = "Allow"
        Principal = { Service = "config.amazonaws.com" }
        Action    = ["s3:GetBucketAcl", "s3:ListBucket"]
        Resource  = aws_s3_bucket.logs_standby.arn
        Condition = {
          StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        }
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "trail" {
  name              = "/howly/cloudtrail"
  retention_in_days = 365
  kms_key_id        = module.kms_primary.arn
}

resource "aws_iam_role" "trail" {
  name = "howly-cloudtrail-logs"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudtrail.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "trail" {
  name = "howly-cloudtrail-logs"
  role = aws_iam_role.trail.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "${aws_cloudwatch_log_group.trail.arn}:*"
    }]
  })
}

resource "aws_cloudtrail" "this" {
  name                          = "howly"
  s3_bucket_name                = aws_s3_bucket.logs.id
  s3_key_prefix                 = "cloudtrail"
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  include_global_service_events = true
  kms_key_id                    = module.kms_primary.arn
  cloud_watch_logs_group_arn    = "${aws_cloudwatch_log_group.trail.arn}:*"
  cloud_watch_logs_role_arn     = aws_iam_role.trail.arn

  depends_on = [aws_s3_bucket_policy.logs]
}

resource "aws_flow_log" "primary" {
  vpc_id               = aws_vpc.this.id
  traffic_type         = "ALL"
  log_destination_type = "s3"
  log_destination      = aws_s3_bucket.logs.arn

  destination_options {
    file_format                = "parquet"
    hive_compatible_partitions = true
    per_hour_partition         = true
  }
}

resource "aws_flow_log" "standby" {
  provider = aws.standby

  vpc_id               = aws_vpc.standby.id
  traffic_type         = "ALL"
  log_destination_type = "s3"
  log_destination      = aws_s3_bucket.logs_standby.arn

  destination_options {
    file_format                = "parquet"
    hive_compatible_partitions = true
    per_hour_partition         = true
  }
}

resource "aws_cloudwatch_log_delivery_source" "cloudfront" {
  name         = "howly-frontend"
  log_type     = "ACCESS_LOGS"
  resource_arn = aws_cloudfront_distribution.frontend.arn
}

resource "aws_cloudwatch_log_delivery_destination" "cloudfront" {
  name          = "howly-frontend"
  output_format = "json"

  delivery_destination_configuration {
    destination_resource_arn = aws_s3_bucket.logs.arn
  }
}

resource "aws_cloudwatch_log_delivery" "cloudfront" {
  delivery_source_name     = aws_cloudwatch_log_delivery_source.cloudfront.name
  delivery_destination_arn = aws_cloudwatch_log_delivery_destination.cloudfront.arn

  s3_delivery_configuration {
    suffix_path = "cloudfront/{DistributionId}/{yyyy}/{MM}/{dd}/{HH}"
  }
}

resource "aws_iam_role" "config" {
  name = "howly-config"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "config.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "config" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWS_ConfigRole"
}

resource "aws_config_configuration_recorder" "primary" {
  name     = "howly"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "primary" {
  name           = "howly"
  s3_bucket_name = aws_s3_bucket.logs.id
  s3_key_prefix  = "config"

  depends_on = [aws_config_configuration_recorder.primary, aws_s3_bucket_policy.logs]
}

resource "aws_config_configuration_recorder_status" "primary" {
  name       = aws_config_configuration_recorder.primary.name
  is_enabled = true

  depends_on = [aws_config_delivery_channel.primary]
}

resource "aws_config_configuration_recorder" "standby" {
  provider = aws.standby

  name     = "howly"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = false
  }
}

resource "aws_config_delivery_channel" "standby" {
  provider = aws.standby

  name           = "howly"
  s3_bucket_name = aws_s3_bucket.logs_standby.id
  s3_key_prefix  = "config"

  depends_on = [aws_config_configuration_recorder.standby, aws_s3_bucket_policy.logs_standby]
}

resource "aws_config_configuration_recorder_status" "standby" {
  provider = aws.standby

  name       = aws_config_configuration_recorder.standby.name
  is_enabled = true

  depends_on = [aws_config_delivery_channel.standby]
}

resource "aws_guardduty_detector" "primary" {
  enable = true
}

resource "aws_guardduty_detector" "standby" {
  provider = aws.standby
  enable   = true
}

resource "aws_securityhub_account" "primary" {
  enable_default_standards = false
}

resource "aws_securityhub_account" "standby" {
  provider                 = aws.standby
  enable_default_standards = false
}

resource "aws_securityhub_standards_subscription" "primary" {
  standards_arn = "arn:aws:securityhub:${var.aws_region}::standards/aws-foundational-security-best-practices/v/1.0.0"

  depends_on = [aws_securityhub_account.primary]
}

resource "aws_securityhub_standards_subscription" "standby" {
  provider      = aws.standby
  standards_arn = "arn:aws:securityhub:${var.standby_region}::standards/aws-foundational-security-best-practices/v/1.0.0"

  depends_on = [aws_securityhub_account.standby]
}
