resource "aws_iam_role" "scheduler_task" {
  name = "howly-production-scheduler"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role" "scheduler" {
  name = "howly-eventbridge-scheduler"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "scheduler" {
  name = "howly-run-scheduler-task"
  role = aws_iam_role.scheduler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["ecs:RunTask"]
        Resource = [
          "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:task-definition/howly-scheduler:*",
          "arn:aws:ecs:${var.standby_region}:${data.aws_caller_identity.current.account_id}:task-definition/howly-scheduler:*",
        ]
        Condition = {
          ArnEquals = {
            "ecs:cluster" = [
              aws_ecs_cluster.this.arn,
              aws_ecs_cluster.standby.arn,
            ]
          }
        }
      },
      {
        Effect = "Allow"
        Action = ["iam:PassRole"]
        Resource = [
          aws_iam_role.execution.arn,
          aws_iam_role.execution_standby.arn,
          aws_iam_role.scheduler_task.arn,
        ]
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "ecs-tasks.amazonaws.com"
          }
        }
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "scheduler" {
  name              = "/howly/scheduler"
  retention_in_days = 90
  kms_key_id        = module.kms_primary.arn
}

resource "aws_cloudwatch_log_group" "scheduler_standby" {
  provider = aws.standby

  name              = "/howly/scheduler"
  retention_in_days = 90
  kms_key_id        = module.kms_standby.arn
}

resource "aws_ecs_task_definition" "scheduler" {
  family                   = "howly-scheduler"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.scheduler_task.arn

  volume {
    name = "tmp"
  }

  container_definitions = jsonencode([{
    name                   = "scheduler"
    image                  = "${aws_ecr_repository.api.repository_url}:${var.api_image_tag}"
    essential              = true
    readonlyRootFilesystem = true
    command                = ["node", "src/scheduler/run.js", "daily"]
    mountPoints            = local.api_tmp_mount
    environment            = local.api_environment
    secrets = [
      { name = "MONGO_URI", valueFrom = aws_secretsmanager_secret.mongo_uri.arn },
      { name = "MONGO_CA_CERT", valueFrom = "${aws_secretsmanager_secret.mongo_tls.arn}:ca::" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.scheduler.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "scheduler"
      }
    }
  }])
}

resource "aws_ecs_task_definition" "scheduler_standby" {
  provider = aws.standby

  family                   = "howly-scheduler"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.execution_standby.arn
  task_role_arn            = aws_iam_role.scheduler_task.arn

  volume {
    name = "tmp"
  }

  container_definitions = jsonencode([{
    name                   = "scheduler"
    image                  = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.standby_region}.amazonaws.com/howly-api:${var.api_image_tag}"
    essential              = true
    readonlyRootFilesystem = true
    command                = ["node", "src/scheduler/run.js", "daily"]
    mountPoints            = local.api_tmp_mount
    environment            = local.api_environment
    secrets = [
      { name = "MONGO_URI", valueFrom = aws_secretsmanager_secret.standby_mongo_uri.arn },
      { name = "MONGO_CA_CERT", valueFrom = "${replace(aws_secretsmanager_secret.mongo_tls.arn, var.aws_region, var.standby_region)}:ca::" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.scheduler_standby.name
        awslogs-region        = var.standby_region
        awslogs-stream-prefix = "scheduler"
      }
    }
  }])
}

resource "aws_scheduler_schedule" "daily" {
  name                         = "howly-streak-daily"
  state                        = var.enable_region_failover ? "DISABLED" : "ENABLED"
  schedule_expression          = "cron(30 0 * * ? *)"
  schedule_expression_timezone = "Europe/Berlin"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_ecs_cluster.this.arn
    role_arn = aws_iam_role.scheduler.arn
    input = jsonencode({
      containerOverrides = [{
        name    = "scheduler"
        command = ["node", "src/scheduler/run.js", "daily"]
      }]
    })

    ecs_parameters {
      task_definition_arn = aws_ecs_task_definition.scheduler.arn
      launch_type         = "FARGATE"
      task_count          = 1

      network_configuration {
        assign_public_ip = false
        security_groups  = [aws_security_group.api.id]
        subnets          = aws_subnet.private[*].id
      }

      tags = {
        HowlyRole = "scheduler"
      }
    }
  }
}

resource "aws_scheduler_schedule" "reminders" {
  name                         = "howly-streak-reminders"
  state                        = var.enable_region_failover ? "DISABLED" : "ENABLED"
  schedule_expression          = "cron(0/30 * * * ? *)"
  schedule_expression_timezone = "Europe/Berlin"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_ecs_cluster.this.arn
    role_arn = aws_iam_role.scheduler.arn
    input = jsonencode({
      containerOverrides = [{
        name    = "scheduler"
        command = ["node", "src/scheduler/run.js", "reminders"]
      }]
    })

    ecs_parameters {
      task_definition_arn = aws_ecs_task_definition.scheduler.arn
      launch_type         = "FARGATE"
      task_count          = 1

      network_configuration {
        assign_public_ip = false
        security_groups  = [aws_security_group.api.id]
        subnets          = aws_subnet.private[*].id
      }

      tags = {
        HowlyRole = "scheduler"
      }
    }
  }
}

resource "aws_scheduler_schedule" "standby_daily" {
  provider = aws.standby

  name                         = "howly-streak-daily"
  state                        = var.enable_region_failover ? "ENABLED" : "DISABLED"
  schedule_expression          = "cron(30 0 * * ? *)"
  schedule_expression_timezone = "Europe/Berlin"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_ecs_cluster.standby.arn
    role_arn = aws_iam_role.scheduler.arn
    input = jsonencode({
      containerOverrides = [{
        name    = "scheduler"
        command = ["node", "src/scheduler/run.js", "daily"]
      }]
    })

    ecs_parameters {
      task_definition_arn = aws_ecs_task_definition.scheduler_standby.arn
      launch_type         = "FARGATE"
      task_count          = 1

      network_configuration {
        assign_public_ip = false
        security_groups  = [aws_security_group.standby_api.id]
        subnets          = aws_subnet.standby_private[*].id
      }

      tags = {
        HowlyRole = "scheduler"
      }
    }
  }
}

resource "aws_scheduler_schedule" "standby_reminders" {
  provider = aws.standby

  name                         = "howly-streak-reminders"
  state                        = var.enable_region_failover ? "ENABLED" : "DISABLED"
  schedule_expression          = "cron(0/30 * * * ? *)"
  schedule_expression_timezone = "Europe/Berlin"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_ecs_cluster.standby.arn
    role_arn = aws_iam_role.scheduler.arn
    input = jsonencode({
      containerOverrides = [{
        name    = "scheduler"
        command = ["node", "src/scheduler/run.js", "reminders"]
      }]
    })

    ecs_parameters {
      task_definition_arn = aws_ecs_task_definition.scheduler_standby.arn
      launch_type         = "FARGATE"
      task_count          = 1

      network_configuration {
        assign_public_ip = false
        security_groups  = [aws_security_group.standby_api.id]
        subnets          = aws_subnet.standby_private[*].id
      }

      tags = {
        HowlyRole = "scheduler"
      }
    }
  }
}
