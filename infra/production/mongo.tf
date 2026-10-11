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

resource "aws_iam_instance_profile" "mongo" {
  name = "howly-production-mongo"
  role = aws_iam_role.mongo.name
}

resource "aws_instance" "mongo" {
  count = 3

  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.mongo_instance_type
  subnet_id              = aws_subnet.private[count.index].id
  vpc_security_group_ids = [aws_security_group.mongo.id]
  iam_instance_profile   = aws_iam_instance_profile.mongo.name

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  root_block_device {
    volume_size = 100
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = <<-EOF
    #!/bin/bash
    set -euo pipefail
    dnf install -y docker
    systemctl enable --now docker
    mkdir -p /var/lib/howly-mongo
    docker run -d --name mongo --restart always \
      -p 27017:27017 \
      -v /var/lib/howly-mongo:/data/db \
      mongo:7 --replSet howly --bind_ip_all
  EOF

  tags = {
    Name   = "howly-mongo-${count.index}"
    Backup = "howly-mongo"
  }
}

resource "aws_route53_record" "mongo" {
  count = 3

  zone_id = aws_route53_zone.internal.zone_id
  name    = "mongo-${count.index}.howly.internal"
  type    = "A"
  ttl     = 60
  records = [aws_instance.mongo[count.index].private_ip]
}

resource "aws_ssm_association" "mongo_replica" {
  name = "AWS-RunShellScript"

  targets {
    key    = "InstanceIds"
    values = [aws_instance.mongo[0].id]
  }

  parameters = {
    commands = <<-EOF
      #!/bin/bash
      set -euo pipefail
      for _ in $(seq 1 30); do
        if docker exec mongo mongosh --quiet --eval 'db.runCommand({ ping: 1 }).ok' | grep -q 1; then
          break
        fi
        sleep 10
      done
      docker exec mongo mongosh --quiet --eval 'try { rs.status() } catch (e) { rs.initiate({_id:"howly", members:[{_id:0, host:"mongo-0.howly.internal:27017"}, {_id:1, host:"mongo-1.howly.internal:27017"}, {_id:2, host:"mongo-2.howly.internal:27017"}]}) }'
    EOF
  }

  depends_on = [aws_route53_record.mongo]
}

resource "aws_iam_role" "dlm" {
  name = "howly-dlm"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "dlm.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "dlm" {
  role       = aws_iam_role.dlm.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole"
}

resource "aws_dlm_lifecycle_policy" "mongo" {
  description        = "Daily MongoDB snapshots copied to the standby region"
  execution_role_arn = aws_iam_role.dlm.arn
  state              = "ENABLED"

  policy_details {
    resource_types = ["INSTANCE"]
    target_tags = {
      Backup = "howly-mongo"
    }

    schedule {
      name = "daily"

      create_rule {
        interval      = 24
        interval_unit = "HOURS"
        times         = ["03:00"]
      }

      retain_rule {
        count = 7
      }

      copy_tags = true

      cross_region_copy_rule {
        target    = var.standby_region
        encrypted = true

        retain_rule {
          interval      = 7
          interval_unit = "DAYS"
        }
      }
    }
  }
}
