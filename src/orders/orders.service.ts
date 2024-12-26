import {
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaClient } from '@prisma/client';
import { RpcException } from '@nestjs/microservices';
import { PaginationDto } from './dto/pagination.dto';
import { ChangeOrderStatusDto } from './dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('OrdersService');

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }
  create(createOrderDto: CreateOrderDto) {
    const order = this.order.create({
      data: createOrderDto,
    });
    return order;
  }

  async findAll(paginationDto: PaginationDto) {
    const totalPages = await this.order.count({
      where: {
        status: paginationDto.status,
      },
    });

    const currentPage = paginationDto.page;
    const pageSize = paginationDto.limit;

    const orders = await this.order.findMany({
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      where: {
        status: paginationDto.status,
      },
    });
    return {
      data: orders,
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages / pageSize),
      },
    };
  }

  async findOne(id: string) {
    const order = await this.order.findUnique({
      where: { id },
    });
    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order #${id} not found`,
      });
    }
    return order;
  }

  async changeOrderStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;
    const order = await this.findOne(id);
    if (order.status === status) {
      return order;
    }
    const updatedOrder = await this.order.update({
      where: { id },
      data: { status },
    });
    return updatedOrder;
  }
}
