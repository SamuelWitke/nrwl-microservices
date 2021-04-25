import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SetResolver } from './set.resolver';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

const rootPath = join(__dirname, '..','..', '..', 'dist', 'apps', 'nx-apollo-react')

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath
    }),
     GraphQLModule.forRoot({
      installSubscriptionHandlers: true,
      autoSchemaFile: 'schema.gql',
    }),

],
  controllers: [AppController],
  providers: [AppService, SetResolver]
})
export class AppModule {}
