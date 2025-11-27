import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { contextMiddleware } from '../../middleware';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriverConfig, ApolloDriver } from '@nestjs/apollo';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'path';
import { StudentsModule } from '../students';
import { UserModule } from '../user';
import { AuthModule } from '../auth';
import Config from '../../config';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.services';
import { AppClass, AppClassSchema } from './schemas/app.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{name: AppClass.name, schema: AppClassSchema}]),
        UserModule,
        AuthModule,
        StudentsModule,
        MongooseModule.forRoot(Config.dbUri, { }),
        ConfigModule.forRoot({ isGlobal: true }),
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            playground: true,
            autoSchemaFile: join(process.cwd(), 'schemas/schema.gql'),
        })
    ],
    controllers: [AppController],
    providers: [AppService]
})

export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {
        consumer.apply(contextMiddleware).forRoutes('*');
    }
}