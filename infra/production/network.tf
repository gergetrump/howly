resource "aws_vpc" "this" {
  cidr_block           = "10.40.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
}

resource "aws_subnet" "public" {
  count = 3

  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet("10.40.0.0/16", 8, count.index)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = false
}

resource "aws_subnet" "private" {
  count = 3

  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet("10.40.0.0/16", 8, count.index + 10)
  availability_zone = local.azs[count.index]
}

resource "aws_eip" "nat" {
  count  = 3
  domain = "vpc"
}

resource "aws_nat_gateway" "this" {
  count = 3

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }
}

resource "aws_route_table_association" "public" {
  count = 3

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count = 3

  vpc_id = aws_vpc.this.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.this[count.index].id
  }

  route {
    cidr_block                = aws_vpc.standby.cidr_block
    vpc_peering_connection_id = aws_vpc_peering_connection.standby.id
  }

  depends_on = [aws_vpc_peering_connection_accepter.standby]
}

resource "aws_route_table_association" "private" {
  count = 3

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

resource "aws_security_group" "alb" {
  name   = "howly-production-alb"
  vpc_id = aws_vpc.this.id
}

resource "aws_security_group" "api" {
  name   = "howly-production-api"
  vpc_id = aws_vpc.this.id
}

resource "aws_security_group" "mongo" {
  name   = "howly-production-mongo"
  vpc_id = aws_vpc.this.id
}

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "alb_to_api" {
  security_group_id            = aws_security_group.alb.id
  referenced_security_group_id = aws_security_group.api.id
  ip_protocol                  = "tcp"
  from_port                    = 3000
  to_port                      = 3000
}

resource "aws_vpc_security_group_ingress_rule" "api_from_alb" {
  security_group_id            = aws_security_group.api.id
  referenced_security_group_id = aws_security_group.alb.id
  ip_protocol                  = "tcp"
  from_port                    = 3000
  to_port                      = 3000
}

resource "aws_vpc_security_group_egress_rule" "api_to_mongo" {
  security_group_id            = aws_security_group.api.id
  referenced_security_group_id = aws_security_group.mongo.id
  ip_protocol                  = "tcp"
  from_port                    = 27017
  to_port                      = 27017
}

resource "aws_vpc_security_group_egress_rule" "api_to_ireland" {
  for_each = toset(local.standby_private_cidrs)

  security_group_id = aws_security_group.api.id
  cidr_ipv4         = each.value
  ip_protocol       = "tcp"
  from_port         = 27017
  to_port           = 27017
}

resource "aws_vpc_security_group_egress_rule" "api_https" {
  security_group_id = aws_security_group.api.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_ingress_rule" "mongo_from_api" {
  security_group_id            = aws_security_group.mongo.id
  referenced_security_group_id = aws_security_group.api.id
  ip_protocol                  = "tcp"
  from_port                    = 27017
  to_port                      = 27017
}

resource "aws_vpc_security_group_ingress_rule" "mongo_self" {
  security_group_id            = aws_security_group.mongo.id
  referenced_security_group_id = aws_security_group.mongo.id
  ip_protocol                  = "tcp"
  from_port                    = 27017
  to_port                      = 27017
}

resource "aws_vpc_security_group_ingress_rule" "mongo_from_ireland" {
  for_each = toset(local.standby_private_cidrs)

  security_group_id = aws_security_group.mongo.id
  cidr_ipv4         = each.value
  ip_protocol       = "tcp"
  from_port         = 27017
  to_port           = 27017
}

resource "aws_vpc_security_group_egress_rule" "mongo_self" {
  security_group_id            = aws_security_group.mongo.id
  referenced_security_group_id = aws_security_group.mongo.id
  ip_protocol                  = "tcp"
  from_port                    = 27017
  to_port                      = 27017
}

resource "aws_vpc_security_group_egress_rule" "mongo_to_ireland" {
  for_each = toset(local.standby_private_cidrs)

  security_group_id = aws_security_group.mongo.id
  cidr_ipv4         = each.value
  ip_protocol       = "tcp"
  from_port         = 27017
  to_port           = 27017
}

resource "aws_vpc_security_group_egress_rule" "mongo_https" {
  security_group_id = aws_security_group.mongo.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}
