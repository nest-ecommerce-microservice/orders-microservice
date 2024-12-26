import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PaginationDto } from './dto/pagination.dto';
import { ChangeOrderStatusDto } from './dto';
import { PRODUCT_SERVICE } from 'src/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('OrdersService');

  constructor(
    @Inject(PRODUCT_SERVICE) private readonly productsClient: ClientProxy,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }

  async create(createOrderDto: CreateOrderDto) {
    try {
      // Check if the products exist
      const productIds = createOrderDto.items.map((item) => item.productId);

      const products: any[] = await firstValueFrom(
        this.productsClient.send({ cmd: 'validate_products' }, productIds),
      );

      // Calculo de los valores
      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find(
          (product) => product.id === orderItem.productId,
        ).price;

        return price * orderItem.quantity + acc;
      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return orderItem.quantity + acc;
      }, 0);

      // Crear la orden
      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems,
          OrderItems: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                price: products.find(
                  (product) => product.id === orderItem.productId,
                ).price,
                quantity: orderItem.quantity,
                productId: orderItem.productId,
              })),
            },
          },
        },
        include: {
          OrderItems: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            },
          },
        },
      });
      return {
        ...order,
        OrderItems: order.OrderItems.map((orderItem) => ({
          ...orderItem,
          name: products.find((product) => product.id === orderItem.productId)
            .name,
        })),
      };
    } catch (error) {
      throw new RpcException(error);
    }
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
      include: {
        OrderItems: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          },
        },
      },
    });
    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order #${id} not found`,
      });
    }

    const productsIds = order.OrderItems.map(
      (orderItem) => orderItem.productId,
    );
    const products = await firstValueFrom(
      this.productsClient.send({ cmd: 'validate_products' }, productsIds),
    );

    return {
      ...order,
      OrderItems: order.OrderItems.map((orderItem) => ({
        ...orderItem,
        name: products.find((product) => product.id === orderItem.productId)
          .name,
      })),
    };
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
