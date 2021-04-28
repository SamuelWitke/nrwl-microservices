import { Module } from '@nestjs/common';
import { GraphQLModule, GraphQLDefinitionsFactory } from '@nestjs/graphql';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SetResolver } from './set.resolver';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import typeDefs from './schema.graphql'

const rootPath = join(
  __dirname,
  '..',
  '..',
  '..',
  'dist',
  'apps',
  'nx-apollo-react'
);

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath
    }),
    GraphQLModule.forRootAsync({
      useFactory() {
        return {
          resolverValidationOptions: {
            requireResolversForResolveType: false
          },
          typeDefs
        }
      }
    }),
  ],
  controllers: [AppController],
  providers: [AppService, SetResolver]
})
export class AppModule { }
