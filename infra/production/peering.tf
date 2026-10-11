resource "aws_vpc_peering_connection" "standby" {
  vpc_id      = aws_vpc.this.id
  peer_vpc_id = aws_vpc.standby.id
  peer_region = var.standby_region
  auto_accept = false

  tags = {
    Name = "howly-frankfurt-ireland"
  }
}

resource "aws_vpc_peering_connection_accepter" "standby" {
  provider = aws.standby

  vpc_peering_connection_id = aws_vpc_peering_connection.standby.id
  auto_accept               = true

  tags = {
    Name = "howly-frankfurt-ireland"
  }
}

resource "aws_vpc_peering_connection_options" "requester" {
  vpc_peering_connection_id = aws_vpc_peering_connection_accepter.standby.id

  requester {
    allow_remote_vpc_dns_resolution = true
  }
}

resource "aws_vpc_peering_connection_options" "accepter" {
  provider = aws.standby

  vpc_peering_connection_id = aws_vpc_peering_connection_accepter.standby.id

  accepter {
    allow_remote_vpc_dns_resolution = true
  }
}

resource "aws_route53_zone_association" "standby" {
  zone_id    = aws_route53_zone.internal.zone_id
  vpc_id     = aws_vpc.standby.id
  vpc_region = var.standby_region
}
