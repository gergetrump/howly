data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023*-kernel-*-arm64"]
  }

  filter {
    name   = "architecture"
    values = ["arm64"]
  }
}

data "aws_ami" "amazon_linux_standby" {
  provider = aws.standby

  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023*-kernel-*-arm64"]
  }

  filter {
    name   = "architecture"
    values = ["arm64"]
  }
}

ephemeral "random_password" "mongo_password" {
  length  = 32
  special = false
}

ephemeral "random_password" "mongo_ops_password" {
  length  = 32
  special = false
}

ephemeral "random_password" "mongo_keyfile" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "mongo_password" {
  name       = "howly/mongo-password"
  kms_key_id = module.kms_primary.arn

  replica {
    region     = var.standby_region
    kms_key_id = module.kms_standby.arn
  }
}

resource "aws_secretsmanager_secret" "mongo_ops_password" {
  name       = "howly/mongo-ops-password"
  kms_key_id = module.kms_primary.arn

  replica {
    region     = var.standby_region
    kms_key_id = module.kms_standby.arn
  }
}

resource "aws_secretsmanager_secret" "mongo_keyfile" {
  name       = "howly/mongo-keyfile"
  kms_key_id = module.kms_primary.arn

  replica {
    region     = var.standby_region
    kms_key_id = module.kms_standby.arn
  }
}

# Version is written by mongo-0 on first boot, then replicated to Ireland.
resource "aws_secretsmanager_secret" "mongo_tls" {
  name       = "howly/mongo-tls"
  kms_key_id = module.kms_primary.arn

  replica {
    region     = var.standby_region
    kms_key_id = module.kms_standby.arn
  }
}

resource "aws_secretsmanager_secret" "mongo_uri" {
  name       = "howly/mongo-uri"
  kms_key_id = module.kms_primary.arn
}

resource "aws_secretsmanager_secret" "standby_mongo_uri" {
  provider = aws.standby

  name       = "howly/mongo-uri"
  kms_key_id = module.kms_standby.arn
}

resource "aws_secretsmanager_secret_version" "mongo_password" {
  secret_id                = aws_secretsmanager_secret.mongo_password.id
  secret_string_wo         = ephemeral.random_password.mongo_password.result
  secret_string_wo_version = 1
}

resource "aws_secretsmanager_secret_version" "mongo_ops_password" {
  secret_id                = aws_secretsmanager_secret.mongo_ops_password.id
  secret_string_wo         = ephemeral.random_password.mongo_ops_password.result
  secret_string_wo_version = 1
}

resource "aws_secretsmanager_secret_version" "mongo_keyfile" {
  secret_id                = aws_secretsmanager_secret.mongo_keyfile.id
  secret_string_wo         = ephemeral.random_password.mongo_keyfile.result
  secret_string_wo_version = 1
}

resource "aws_secretsmanager_secret_version" "mongo_uri" {
  secret_id                = aws_secretsmanager_secret.mongo_uri.id
  secret_string_wo         = "mongodb://howly:${ephemeral.random_password.mongo_password.result}@${join(",", local.mongo_hosts)}/howly?replicaSet=howly&authSource=howly&tls=true"
  secret_string_wo_version = 1
}

resource "aws_iam_role" "mongo" {
  name = "howly-production-mongo"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "mongo_ssm" {
  role       = aws_iam_role.mongo.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "mongo_ecr" {
  role       = aws_iam_role.mongo.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy_attachment" "mongo_cloudwatch" {
  role       = aws_iam_role.mongo.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "mongo" {
  name = "howly-production-mongo"
  role = aws_iam_role.mongo.name
}

resource "aws_iam_role_policy" "mongo_secrets" {
  name = "howly-mongo-secrets"
  role = aws_iam_role.mongo.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
        Resource = [
          aws_secretsmanager_secret.mongo_password.arn,
          replace(aws_secretsmanager_secret.mongo_password.arn, var.aws_region, var.standby_region),
          aws_secretsmanager_secret.mongo_ops_password.arn,
          replace(aws_secretsmanager_secret.mongo_ops_password.arn, var.aws_region, var.standby_region),
          aws_secretsmanager_secret.mongo_keyfile.arn,
          replace(aws_secretsmanager_secret.mongo_keyfile.arn, var.aws_region, var.standby_region),
          aws_secretsmanager_secret.mongo_tls.arn,
          replace(aws_secretsmanager_secret.mongo_tls.arn, var.aws_region, var.standby_region),
        ]
      },
      {
        Effect = "Allow"
        Action = ["secretsmanager:PutSecretValue"]
        Resource = [
          aws_secretsmanager_secret.mongo_tls.arn,
          replace(aws_secretsmanager_secret.mongo_tls.arn, var.aws_region, var.standby_region),
          aws_secretsmanager_secret.standby_mongo_uri.arn,
        ]
      },
      {
        Effect = "Allow"
        Action = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = [
          module.kms_primary.arn,
          module.kms_standby.arn,
        ]
      },
    ]
  })
}

# The Ireland member fences Frankfurt writers before promotion. The same
# instance role is attached to every member. It can scale the Frankfurt API,
# stop only tasks tagged as scheduler, and update the two streak schedules.
resource "aws_iam_role_policy" "mongo_fence" {
  name = "howly-mongo-fence"
  role = aws_iam_role.mongo.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["ecs:UpdateService", "ecs:DescribeServices"]
        Resource = [
          "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:cluster/${aws_ecs_cluster.this.name}",
          "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:service/${aws_ecs_cluster.this.name}/${aws_ecs_service.api.name}",
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:ListTasks"]
        Resource = ["arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:cluster/${aws_ecs_cluster.this.name}"]
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:DescribeTasks"]
        Resource = ["arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:task/${aws_ecs_cluster.this.name}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:StopTask"]
        Resource = ["arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:task/${aws_ecs_cluster.this.name}/*"]
        Condition = {
          StringEquals = {
            "aws:ResourceTag/HowlyRole" = "scheduler"
          }
        }
      },
      {
        Effect = "Allow"
        Action = ["scheduler:GetSchedule", "scheduler:UpdateSchedule"]
        Resource = [
          "arn:aws:scheduler:${var.aws_region}:${data.aws_caller_identity.current.account_id}:schedule/default/${aws_scheduler_schedule.daily.name}",
          "arn:aws:scheduler:${var.aws_region}:${data.aws_caller_identity.current.account_id}:schedule/default/${aws_scheduler_schedule.reminders.name}",
        ]
      },
      {
        Effect = "Allow"
        Action = ["iam:PassRole"]
        Resource = [aws_iam_role.scheduler.arn]
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "scheduler.amazonaws.com"
          }
        }
      },
    ]
  })
}

resource "aws_iam_role" "maintenance" {
  name = "howly-mongo-maintenance"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ssm.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "maintenance" {
  role       = aws_iam_role.maintenance.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonSSMMaintenanceWindowRole"
}

locals {
  mongo_user_data = replace(
    file("${path.module}/templates/mongo-user-data.sh"),
    "__MONGO_IMAGE_DIGEST__",
    var.mongo_image_digest,
  )
}

resource "aws_instance" "mongo" {
  count = 3

  ami                     = data.aws_ami.amazon_linux.id
  instance_type           = var.mongo_instance_type
  subnet_id               = aws_subnet.private[count.index].id
  vpc_security_group_ids  = [aws_security_group.mongo.id]
  iam_instance_profile    = aws_iam_instance_profile.mongo.name
  user_data               = local.mongo_user_data
  disable_api_termination = var.mongo_termination_protection

  metadata_options {
    http_endpoint          = "enabled"
    http_tokens            = "required"
    instance_metadata_tags = "enabled"
  }

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
    kms_key_id  = module.kms_primary.arn
  }

  tags = {
    Name       = "howly-mongo-${count.index}"
    Backup     = "howly-mongo"
    MongoIndex = tostring(count.index)
  }

  depends_on = [
    aws_secretsmanager_secret_version.mongo_keyfile,
    aws_secretsmanager_secret_version.mongo_password,
    aws_secretsmanager_secret_version.mongo_ops_password,
    aws_secretsmanager_secret.mongo_tls,
    aws_ecr_repository.mongo,
  ]

  lifecycle {
    ignore_changes = [ami]
  }
}

resource "aws_ebs_volume" "mongo" {
  count = 3

  availability_zone = local.azs[count.index]
  size              = 100
  type              = "gp3"
  encrypted         = true
  kms_key_id        = module.kms_primary.arn

  tags = {
    Name   = "howly-mongo-${count.index}"
    Backup = "howly-mongo"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_volume_attachment" "mongo" {
  count = 3

  device_name                    = "/dev/sdf"
  volume_id                      = aws_ebs_volume.mongo[count.index].id
  instance_id                    = aws_instance.mongo[count.index].id
  stop_instance_before_detaching = true
}

resource "aws_instance" "mongo_standby" {
  provider = aws.standby

  ami                     = data.aws_ami.amazon_linux_standby.id
  instance_type           = var.mongo_instance_type
  subnet_id               = aws_subnet.standby_private[0].id
  vpc_security_group_ids  = [aws_security_group.mongo_standby.id]
  iam_instance_profile    = aws_iam_instance_profile.mongo.name
  user_data               = local.mongo_user_data
  disable_api_termination = var.mongo_termination_protection

  metadata_options {
    http_endpoint          = "enabled"
    http_tokens            = "required"
    instance_metadata_tags = "enabled"
  }

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
    kms_key_id  = module.kms_standby.arn
  }

  tags = {
    Name       = "howly-mongo-3"
    Backup     = "howly-mongo"
    MongoIndex = "3"
  }

  depends_on = [
    aws_secretsmanager_secret.mongo_tls,
    aws_ecr_repository.mongo_standby,
    aws_route53_zone_association.standby,
  ]

  lifecycle {
    ignore_changes = [ami]
  }
}

resource "aws_ebs_volume" "mongo_standby" {
  provider = aws.standby

  availability_zone = aws_subnet.standby_private[0].availability_zone
  size              = 100
  type              = "gp3"
  encrypted         = true
  kms_key_id        = module.kms_standby.arn

  tags = {
    Name   = "howly-mongo-3"
    Backup = "howly-mongo"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_volume_attachment" "mongo_standby" {
  provider = aws.standby

  device_name                    = "/dev/sdf"
  volume_id                      = aws_ebs_volume.mongo_standby.id
  instance_id                    = aws_instance.mongo_standby.id
  stop_instance_before_detaching = true
}

resource "aws_route53_record" "mongo" {
  count = 3

  zone_id = aws_route53_zone.internal.zone_id
  name    = "mongo-${count.index}.howly.internal"
  type    = "A"
  ttl     = 60
  records = [aws_instance.mongo[count.index].private_ip]
}

resource "aws_route53_record" "mongo_standby" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "mongo-3.howly.internal"
  type    = "A"
  ttl     = 60
  records = [aws_instance.mongo_standby.private_ip]
}

resource "aws_ssm_association" "mongo_replica" {
  name                = "AWS-RunShellScript"
  association_name    = "howly-mongo-replica"
  schedule_expression = "rate(30 minutes)"

  targets {
    key    = "InstanceIds"
    values = [aws_instance.mongo[0].id]
  }

  parameters = {
    commands = file("${path.module}/templates/mongo-init.sh")
  }

  depends_on = [
    aws_route53_record.mongo,
    aws_route53_record.mongo_standby,
    aws_volume_attachment.mongo,
    aws_volume_attachment.mongo_standby,
  ]
}

resource "aws_ssm_document" "restore_standby" {
  provider = aws.standby

  name            = "howly-restore-standby"
  document_type   = "Command"
  document_format = "JSON"

  content = jsonencode({
    schemaVersion = "2.2"
    description   = "On the default path, stop Frankfurt writers before promotion. allowUnfencedPromotion skips that fence. DNS is unchanged."
    parameters = {
      maxLagSeconds = {
        type           = "String"
        description    = "Refuse to promote when Ireland is further behind than this many seconds."
        default        = tostring(var.failover_max_lag_seconds)
        allowedPattern = "^[1-9][0-9]*$"
      }
      allowUnfencedPromotion = {
        type           = "String"
        description    = "Set to true only when Frankfurt cannot accept writes. The promotion then uses a forced reconfig."
        default        = "false"
        allowedPattern = "^(true|false)$"
      }
      frankfurtRegion       = { type = "String", default = var.aws_region }
      ecsCluster            = { type = "String", default = aws_ecs_cluster.this.name }
      ecsService            = { type = "String", default = aws_ecs_service.api.name }
      frankfurtDesiredCount = { type = "String", default = tostring(aws_ecs_service.api.desired_count) }
      dailySchedule         = { type = "String", default = aws_scheduler_schedule.daily.name }
      reminderSchedule      = { type = "String", default = aws_scheduler_schedule.reminders.name }
      schedulerFamily       = { type = "String", default = aws_ecs_task_definition.scheduler.family }
    }
    mainSteps = [{
      action = "aws:runShellScript"
      name   = "promote"
      inputs = {
        timeoutSeconds = 2400
        runCommand     = [file("${path.module}/templates/restore-standby.sh")]
      }
    }]
  })
}

resource "aws_ssm_maintenance_window" "mongo" {
  name     = "howly-mongo"
  schedule = "cron(0 4 ? * SUN *)"
  duration = 2
  cutoff   = 1
}

resource "aws_ssm_maintenance_window_target" "mongo" {
  window_id     = aws_ssm_maintenance_window.mongo.id
  name          = "howly-mongo"
  resource_type = "INSTANCE"

  targets {
    key    = "tag:Backup"
    values = ["howly-mongo"]
  }
}

resource "aws_ssm_maintenance_window_task" "mongo" {
  window_id        = aws_ssm_maintenance_window.mongo.id
  task_type        = "RUN_COMMAND"
  task_arn         = "AWS-RunPatchBaseline"
  service_role_arn = aws_iam_role.maintenance.arn
  priority         = 1
  max_concurrency  = "1"
  max_errors       = "0"

  targets {
    key    = "WindowTargetIds"
    values = [aws_ssm_maintenance_window_target.mongo.id]
  }

  task_invocation_parameters {
    run_command_parameters {
      parameter {
        name   = "Operation"
        values = ["Install"]
      }

      parameter {
        name   = "RebootOption"
        values = ["RebootIfNeeded"]
      }
    }
  }
}

resource "aws_ssm_maintenance_window" "mongo_standby" {
  provider = aws.standby

  name     = "howly-mongo"
  schedule = "cron(0 5 ? * SUN *)"
  duration = 2
  cutoff   = 1
}

resource "aws_ssm_maintenance_window_target" "mongo_standby" {
  provider = aws.standby

  window_id     = aws_ssm_maintenance_window.mongo_standby.id
  name          = "howly-mongo"
  resource_type = "INSTANCE"

  targets {
    key    = "tag:Backup"
    values = ["howly-mongo"]
  }
}

resource "aws_ssm_maintenance_window_task" "mongo_standby" {
  provider = aws.standby

  window_id        = aws_ssm_maintenance_window.mongo_standby.id
  task_type        = "RUN_COMMAND"
  task_arn         = "AWS-RunPatchBaseline"
  service_role_arn = aws_iam_role.maintenance.arn
  priority         = 1
  max_concurrency  = "1"
  max_errors       = "0"

  targets {
    key    = "WindowTargetIds"
    values = [aws_ssm_maintenance_window_target.mongo_standby.id]
  }

  task_invocation_parameters {
    run_command_parameters {
      parameter {
        name   = "Operation"
        values = ["Install"]
      }

      parameter {
        name   = "RebootOption"
        values = ["RebootIfNeeded"]
      }
    }
  }
}
