locals {
  interface_endpoints = toset([
    "ecr.api",
    "ecr.dkr",
    "secretsmanager",
    "logs",
    "kms",
    "ssm",
    "ssmmessages",
    "ec2messages",
  ])
}

resource "aws_security_group" "endpoints" {
  name   = "howly-production-endpoints"
  vpc_id = aws_vpc.this.id
}

resource "aws_security_group" "endpoints_standby" {
  provider = aws.standby
  name     = "howly-standby-endpoints"
  vpc_id   = aws_vpc.standby.id
}

resource "aws_vpc_security_group_ingress_rule" "endpoints" {
  security_group_id = aws_security_group.endpoints.id
  cidr_ipv4         = aws_vpc.this.cidr_block
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_ingress_rule" "endpoints_standby" {
  provider          = aws.standby
  security_group_id = aws_security_group.endpoints_standby.id
  cidr_ipv4         = aws_vpc.standby.cidr_block
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_endpoint" "interface" {
  for_each = local.interface_endpoints

  vpc_id              = aws_vpc.this.id
  service_name        = "com.amazonaws.${var.aws_region}.${each.key}"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "howly-${replace(each.key, ".", "-")}"
  }
}

resource "aws_vpc_endpoint" "interface_standby" {
  provider = aws.standby
  for_each = local.interface_endpoints

  vpc_id              = aws_vpc.standby.id
  service_name        = "com.amazonaws.${var.standby_region}.${each.key}"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.standby_private[*].id
  security_group_ids  = [aws_security_group.endpoints_standby.id]
  private_dns_enabled = true

  tags = {
    Name = "howly-${replace(each.key, ".", "-")}"
  }
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.this.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id
}

resource "aws_vpc_endpoint" "s3_standby" {
  provider = aws.standby

  vpc_id            = aws_vpc.standby.id
  service_name      = "com.amazonaws.${var.standby_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.standby_private[*].id
}
