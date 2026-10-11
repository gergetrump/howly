data "aws_availability_zones" "standby" {
  provider = aws.standby
  state    = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

resource "aws_vpc" "standby" {
  provider = aws.standby

  cidr_block           = "10.50.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
}

resource "aws_internet_gateway" "standby" {
  provider = aws.standby
  vpc_id   = aws_vpc.standby.id
}

resource "aws_subnet" "standby_public" {
  provider = aws.standby
  count    = 2

  vpc_id                  = aws_vpc.standby.id
  cidr_block              = cidrsubnet("10.50.0.0/16", 8, count.index)
  availability_zone       = data.aws_availability_zones.standby.names[count.index]
  map_public_ip_on_launch = false
}

resource "aws_subnet" "standby_private" {
  provider = aws.standby
  count    = 2

  vpc_id            = aws_vpc.standby.id
  cidr_block        = cidrsubnet("10.50.0.0/16", 8, count.index + 10)
  availability_zone = data.aws_availability_zones.standby.names[count.index]
}

resource "aws_eip" "standby_nat" {
  provider = aws.standby
  domain   = "vpc"
}

resource "aws_nat_gateway" "standby" {
  provider = aws.standby

  allocation_id = aws_eip.standby_nat.id
  subnet_id     = aws_subnet.standby_public[0].id
}

resource "aws_route_table" "standby_public" {
  provider = aws.standby
  vpc_id   = aws_vpc.standby.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.standby.id
  }
}

resource "aws_route_table_association" "standby_public" {
  provider = aws.standby
  count    = 2

  subnet_id      = aws_subnet.standby_public[count.index].id
  route_table_id = aws_route_table.standby_public.id
}

resource "aws_route_table" "standby_private" {
  provider = aws.standby
  vpc_id   = aws_vpc.standby.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.standby.id
  }
}

resource "aws_route_table_association" "standby_private" {
  provider = aws.standby
  count    = 2

  subnet_id      = aws_subnet.standby_private[count.index].id
  route_table_id = aws_route_table.standby_private.id
}

resource "aws_security_group" "standby_alb" {
  provider = aws.standby
  name     = "howly-standby-alb"
  vpc_id   = aws_vpc.standby.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "standby_api" {
  provider = aws.standby
  name     = "howly-standby-api"
  vpc_id   = aws_vpc.standby.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.standby_alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lb" "standby" {
  provider = aws.standby

  name               = "howly-api"
  load_balancer_type = "application"
  security_groups    = [aws_security_group.standby_alb.id]
  subnets            = aws_subnet.standby_public[*].id
}

resource "aws_lb_target_group" "standby" {
  provider = aws.standby

  name        = "howly-api"
  port        = 3000
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.standby.id

  health_check {
    path = "/api/health"
  }
}

resource "aws_acm_certificate" "standby" {
  provider = aws.standby

  domain_name       = local.api_host
  validation_method = "DNS"
}

resource "aws_route53_record" "standby_cert" {
  for_each = {
    for dvo in aws_acm_certificate.standby.domain_validation_options : dvo.domain_name => {
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

resource "aws_acm_certificate_validation" "standby" {
  provider = aws.standby

  certificate_arn         = aws_acm_certificate.standby.arn
  validation_record_fqdns = [for record in aws_route53_record.standby_cert : record.fqdn]
}

resource "aws_lb_listener" "standby" {
  provider = aws.standby

  load_balancer_arn = aws_lb.standby.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = aws_acm_certificate_validation.standby.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.standby.arn
  }
}

resource "aws_cloudwatch_log_group" "standby" {
  provider = aws.standby

  name              = "/howly/api"
  retention_in_days = 14
}

resource "aws_ecs_cluster" "standby" {
  provider = aws.standby
  name     = "howly"
}

resource "aws_ecs_task_definition" "standby" {
  provider = aws.standby

  family                   = "howly-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name      = "api"
    image     = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.standby_region}.amazonaws.com/howly-api:${var.api_image_tag}"
    essential = true
    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3000" },
      { name = "TRUST_PROXY", value = "true" },
      { name = "SERVER_BASE_URL", value = "https://${local.api_host}" },
      { name = "FRONTEND_BASE_URL", value = "https://${local.app_host}" },
    ]
    secrets = [
      { name = "JWT_SECRET", valueFrom = replace(aws_secretsmanager_secret.jwt.arn, var.aws_region, var.standby_region) },
      { name = "MONGO_URI", valueFrom = replace(aws_secretsmanager_secret.mongo_uri.arn, var.aws_region, var.standby_region) },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.standby.name
        awslogs-region        = var.standby_region
        awslogs-stream-prefix = "api"
      }
    }
  }])
}

resource "aws_ecs_service" "standby" {
  provider = aws.standby

  name            = "howly-api"
  cluster         = aws_ecs_cluster.standby.id
  task_definition = aws_ecs_task_definition.standby.arn
  desired_count   = var.standby_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.standby_private[*].id
    security_groups  = [aws_security_group.standby_api.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.standby.arn
    container_name   = "api"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.standby]
}

resource "aws_route53_record" "api_standby" {
  zone_id        = aws_route53_zone.public.zone_id
  name           = local.api_host
  type           = "A"
  set_identifier = "standby"

  failover_routing_policy {
    type = "SECONDARY"
  }

  alias {
    name                   = aws_lb.standby.dns_name
    zone_id                = aws_lb.standby.zone_id
    evaluate_target_health = false
  }
}
