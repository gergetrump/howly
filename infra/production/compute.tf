resource "aws_ecr_repository" "api" {
  name                 = "howly-api"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = module.kms_primary.arn
  }
}

resource "aws_ecr_repository" "mongo" {
  name                 = "howly-mongo"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = module.kms_primary.arn
  }
}

resource "aws_ecr_repository" "api_standby" {
  provider = aws.standby

  name                 = "howly-api"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = module.kms_standby.arn
  }
}

resource "aws_ecr_repository" "mongo_standby" {
  provider = aws.standby

  name                 = "howly-mongo"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = module.kms_standby.arn
  }
}

resource "aws_ecr_lifecycle_policy" "untagged" {
  for_each = {
    api   = aws_ecr_repository.api.name
    mongo = aws_ecr_repository.mongo.name
  }

  repository = each.value

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Expire untagged images after a week"
      selection = {
        tagStatus   = "untagged"
        countType   = "sinceImagePushed"
        countUnit   = "days"
        countNumber = 7
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "untagged_standby" {
  provider = aws.standby
  for_each = {
    api   = aws_ecr_repository.api_standby.name
    mongo = aws_ecr_repository.mongo_standby.name
  }

  repository = each.value

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Expire untagged images after a week"
      selection = {
        tagStatus   = "untagged"
        countType   = "sinceImagePushed"
        countUnit   = "days"
        countNumber = 7
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_ecr_replication_configuration" "this" {
  replication_configuration {
    rule {
      destination {
        region      = var.standby_region
        registry_id = data.aws_caller_identity.current.account_id
      }

      repository_filter {
        filter      = "howly-api"
        filter_type = "PREFIX_MATCH"
      }
    }

    rule {
      destination {
        region      = var.standby_region
        registry_id = data.aws_caller_identity.current.account_id
      }

      repository_filter {
        filter      = "howly-mongo"
        filter_type = "PREFIX_MATCH"
      }
    }
  }

  depends_on = [
    aws_ecr_repository.api_standby,
    aws_ecr_repository.mongo_standby,
  ]
}

resource "aws_secretsmanager_secret" "jwt" {
  name       = "howly/jwt"
  kms_key_id = module.kms_primary.arn

  replica {
    region     = var.standby_region
    kms_key_id = module.kms_standby.arn
  }
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id                = aws_secretsmanager_secret.jwt.id
  secret_string_wo         = var.jwt_secret
  secret_string_wo_version = 1
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/howly/api"
  retention_in_days = 90
  kms_key_id        = module.kms_primary.arn
}

resource "aws_cloudwatch_log_group" "exec" {
  name              = "/howly/ecs-exec"
  retention_in_days = 90
  kms_key_id        = module.kms_primary.arn
}

resource "aws_iam_role" "execution" {
  name = "howly-production-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role" "execution_standby" {
  name = "howly-production-execution-standby"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy_attachment" "execution_standby" {
  role       = aws_iam_role.execution_standby.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "execution_secrets" {
  name = "howly-read-secrets"
  role = aws_iam_role.execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = [
          aws_secretsmanager_secret.jwt.arn,
          aws_secretsmanager_secret.mongo_uri.arn,
          aws_secretsmanager_secret.mongo_tls.arn,
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = [module.kms_primary.arn]
      },
    ]
  })
}

resource "aws_iam_role_policy" "execution_standby_secrets" {
  name = "howly-read-standby-secrets"
  role = aws_iam_role.execution_standby.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = [
          replace(aws_secretsmanager_secret.jwt.arn, var.aws_region, var.standby_region),
          aws_secretsmanager_secret.standby_mongo_uri.arn,
          replace(aws_secretsmanager_secret.mongo_tls.arn, var.aws_region, var.standby_region),
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = [module.kms_standby.arn]
      },
    ]
  })
}

resource "aws_iam_role" "task" {
  name = "howly-production-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "exec" {
  name = "howly-ecs-exec"
  role = aws_iam_role.task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = ["logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogGroups"]
        Resource = [
          aws_cloudwatch_log_group.exec.arn,
          "${aws_cloudwatch_log_group.exec.arn}:*",
          aws_cloudwatch_log_group.exec_standby.arn,
          "${aws_cloudwatch_log_group.exec_standby.arn}:*",
        ]
      },
    ]
  })
}

resource "aws_ecs_cluster" "this" {
  name = "howly"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"

      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.exec.name
      }
    }
  }
}

locals {
  api_health_check = {
    command     = ["CMD-SHELL", "node -e \"fetch('http://127.0.0.1:3000/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]
    interval    = 30
    timeout     = 5
    retries     = 3
    startPeriod = 40
  }
  api_tmp_mount = [{
    sourceVolume  = "tmp"
    containerPath = "/tmp"
    readOnly      = false
  }]
}

resource "aws_ecs_task_definition" "api" {
  family                   = "howly-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  volume {
    name = "tmp"
  }

  container_definitions = jsonencode([{
    name                   = "api"
    image                  = "${aws_ecr_repository.api.repository_url}:${var.api_image_tag}"
    essential              = true
    readonlyRootFilesystem = true
    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]
    mountPoints = local.api_tmp_mount
    healthCheck = local.api_health_check
    environment = local.api_environment
    secrets = [
      { name = "JWT_SECRET", valueFrom = aws_secretsmanager_secret.jwt.arn },
      { name = "MONGO_URI", valueFrom = aws_secretsmanager_secret.mongo_uri.arn },
      { name = "MONGO_CA_CERT", valueFrom = "${aws_secretsmanager_secret.mongo_tls.arn}:ca::" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.api.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "api"
      }
    }
  }])
}

resource "aws_lb" "api" {
  name                       = "howly-api"
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.alb.id]
  subnets                    = aws_subnet.public[*].id
  drop_invalid_header_fields = true
  desync_mitigation_mode     = "defensive"
  enable_deletion_protection = true

  access_logs {
    bucket  = aws_s3_bucket.logs.id
    prefix  = "alb"
    enabled = true
  }

  depends_on = [aws_s3_bucket_policy.logs]
}

resource "aws_lb_target_group" "api" {
  name        = "howly-api"
  port        = 3000
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.this.id

  health_check {
    path = "/api/health"
  }
}

resource "aws_acm_certificate" "api" {
  domain_name       = local.api_host
  validation_method = "DNS"
}

resource "aws_route53_record" "api_cert" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = aws_route53_zone.public.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 300
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert : record.fqdn]
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.api.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = aws_acm_certificate_validation.api.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_ecs_service" "api" {
  name                               = "howly-api"
  cluster                            = aws_ecs_cluster.this.id
  task_definition                    = aws_ecs_task_definition.api.arn
  # Ireland's apply keeps this at zero. The restore script scales it down first,
  # and a later plan must not start Frankfurt writers again.
  desired_count                      = var.enable_region_failover ? 0 : 2
  launch_type                        = "FARGATE"
  enable_execute_command             = true
  availability_zone_rebalancing      = "ENABLED"
  health_check_grace_period_seconds  = 60
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.api.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.https, aws_ssm_association.mongo_replica]
}
