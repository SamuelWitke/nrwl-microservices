# NxApolloExample

This project was generated using [Nx](https://nx.dev).

<p align="center"><img src="https://raw.githubusercontent.com/nrwl/nx/master/nx-logo.png" width="450"></p>

🔎 **Nx is a set of Extensible Dev Tools for Monorepos.**

## Run demo
GraphQL API
- `npm start api`

[React](https://reactjs.org)
- `npm start nx-apollo-react`

## What you’ll create
In this article, we’ll be creating a simple GraphQL API that will allow us to track some information about Lego sets. We’ll create this API using NestJS, and it will be consumed by both an Angular and a React application. We’ll have this all inside of a Nx Workspace in a single repository.

## What you’ll learn
In this article, you’ll learn how to:
- Create an Nx workspace for both frontend and backend applications
- Create a GraphQL API using NestJS
- Autogenerate frontend code based on your GraphQL schema
- Create an Angular application to consume your GraphQL api
- Create a React application to consume your GraphQL api

## Create a new workspace

Let’s get started by creating our Nx workspace. We’ll start with an empty workspace that uses the Nx CLI:

`npx create-nx-workspace --preset=empty --cli nx nx-apollo-example`

## Create GraphQL API
We’ll be using the NestJS framework to create our GraphQL API. First, let’s add NestJS to our Nx workspace and create an application:

`npm install --save-dev @nrwl/nest`

`nx generate @nrwl/nest:application api`

Once our application is created, we’ll install the GraphQL modules needed for Nest

`npm install @nestjs/graphql apollo-server-express graphql-tools graphql`

We’re going to need a GraphQL schema to create our API, so let’s create a very simple one with a single query and a single mutation. Create a file named 'schema.graphql in the api application:

```
// apps/api/src/app/schema.graphql

type Set {
    id: Int!
    name: String
    year: Int
    numParts: Int
}

type Query {
    allSets: [Set]
}

type Mutation {
    addSet(name: String, year: String, numParts: Int): Set
}
```

Now we can import the GraphQLModule and use that schema in NestJS.

```typescript
// apps/api/src/app/app.module.ts

import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    GraphQLModule.forRoot({
      typePaths: ['./**/*.graphql']
    })
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
```

This is already enough to see some progress when we run our API application.

`npm start api`

When the application is running, you can bring up the GraphQL playground in your browser at [http://localhost:3333/graphql](http://localhost:3333/graphql)

Here you can inspect your GraphQL schema as well as submit queries. The queries won’t return anything right now because we haven’t provided any data. Let’s take care of that by writing a resolver. Create a new file in your api project called `set.resolver.ts`. Then add this code:

```typescript
// apps/api/src/app/set.resolver.ts

import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

export interface SetEntity {
  id: number;
  name: string;
  numParts: number;
  year: string;
}

@Resolver('Set')
export class SetResolver {
  private sets: SetEntity[] = [
    {
      id: 1,
      name: 'Voltron',
      numParts: 2300,
      year: '2019'
    },
    {
      id: 2,
      name: 'Ship in a Bottle',
      numParts: 900,
      year: '2019'
    }
  ];

  @Query('allSets')
  getAllSets(): SetEntity[] {
    return this.sets;
  }

  @Mutation()
  addSet(
    @Args('name') name: string,
    @Args('year') year: string,
    @Args('numParts') numParts: number
  ) {
    const newSet = {
      id: this.sets.length + 1,
      name,
      year,
      numParts: +numParts
    };

    this.sets.push(newSet);

    return newSet;
  }
}
```

This is a very simple resolver which will hold our data in memory. It will return the current contents of the sets array for the allSets query and allow users to add a new set using the addSet mutation. Once we have this written, we need to add it to our providers array in our app module:

```typescript
// apps/api/src/app/app.module.ts

import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SetResolver } from './set.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot({
      typePaths: ['./**/*.graphql']
    })
  ],
  controllers: [AppController],
  providers: [AppService, SetResolver]
})
export class AppModule {}
```

Go back to your GraphQL Playground and see if your queries return any data now. Try a query and a mutation:

```
query allSets {
  allSets{
    id,
    name,
    numParts
  }
}

mutation addSet {
  addSet(name: "My New Set", numParts: 200, year: "2020") {
    id
 }
}
```

Now that our API is working, we’re ready to build a frontend to access this.

## Add Angular support

We'll start with our Angular app. The angular app and libraries will be separate from our React app, this section can be skipped if you're only interested in React support. 

Just like with Angular, we need to add Angular support to our workspace and create an application:

`npm install --save-dev @nrwl/angular`

## Create Angular libraries
Nx alllows us to break down our code into well-organized libraries for consumption by apps, so let's create a couple of Angular libraries to organize our work. We'll create a data-access library which will handle communication with the backend, and a feature-sets library which will include our container components for displaying the Lego set data. Ina  real app, we might also create a ui library which would include our reusable presentational components, but we'll leave that out in this example. We'll group both of these libraries into an angular directory in libs to keep them separate from the React libraries we'll create later. For more information on how to organize your Angular monorepo using Nx, read our book *Enterprise Angular Monorepo Pattern* by registering at [Nrwl Connect](https://connect.nrwl.io/).

To create the described libraries, we run these commands:

`nx generate @nrwl/angular:library feature-sets --directory angular --style css`

`nx generate @nrwl/angular:library data-access --directory angular --style css`

## Setup Angular Code Generation
We’ll take advantage of a tool called GraphQL Code Generator to make development of our data-access library a little faster. As always, first we install dependencies:

`npm install --save-dev @graphql-codegen/cli @graphql-codegen/typescript-operations @graphql-codegen/typescript-apollo-angular`

We’ll need to create some queries and mutations for the frontend to consume GraphQL. Create a folder named graphql in your data-access library with a file inside called operations.graphql:

```
# libs/angular/data-access/src/lib/graphql/operations.graphql

query setList {
  allSets{
    id
    name
    numParts
    year
  }
}


mutation addSet($name: String!, $year: String!, $numParts: Int!) {
  addSet(name: $name, year: $year, numParts: $numParts) {
    id
    name
    numParts
    year
  }
}
```

To configure the code generator for Angular, we’ll create a file named codegen.yml in our library:

```yaml
# libs/angular/data-access/codegen.yml
overwrite: true
schema: "apps/api/src/app/schema.graphql"
generates:
  libs/angular/data-access/src/lib/generated/generated.ts:
    documents: "libs/angular/data-access/src/lib/graphql/**/*.graphql"
    plugins:
      - "typescript"
      - "typescript-operations"
      - "typescript-apollo-angular"
```

This configuration will grab all of our GraphQL files and generate all of the needed types and services to consume the API. 

To actually run this code generator, we’ll add a new task to our Angular project in our workspace:
```json
// workspace.json

{
  "version": 1,
  "projects": {
    "angular-data-access": {
      ...
      "architect": {
        ...
        "generate": {
          "builder": "@nrwl/workspace:run-commands",
          "options": {
            "commands": [
              {
                "command": "npx graphql-codegen --config libs/angular/data-access/codegen.yml"
              }
            ]
          }
        }
      }
    },
    ...
}
```

Now we can run that using the Nx CLI:

`nx run angular-data-access:generate`

We should now have a folder called generated in our data-access library with a file named generated.ts. It contains typing information about the GraphQL schema and the operations we defined. It even has some services which will make consuming this api super-fast.

To make these available to consumers, we'll export them in the index.ts of our data-access library:

```typescript
// libs/angular/data-access/src/index.ts

export * from './lib/angular-data-access.module';
export * from './lib/generated/generated';
```

## Create Angular components
We now have all we need to start building our Angular components. We’ll create two: a list of Lego sets and a form to add a Lego set. We use the Nx CLI to build these:

`nx generate @schematics/angular:component --name=SetList --project=angular-feature-sets --export`

`nx generate @schematics/angular:component --name=SetForm --project=angular-feature-sets --export`

Since our form will be using the ReactiveFormsModule, remember to import that into your module. Your `angular-feature-sets.module.ts` file should look like this now.

```typescript
// libs/angular/feature-sets/src/lib/angular-feature-sets.module.ts

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SetFormComponent } from './set-form/set-form.component';
import { SetListComponent } from './set-list/set-list.component';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule],
  declarations: [SetListComponent, SetFormComponent],
  exports: [SetListComponent, SetFormComponent]
})
export class AngularFeatureSetsModule {}

```

In the SetList component, add the following:

```html
<!-- libs/angular/feature-sets/src/lib/set-list/set-list.component.html -->

<ul>
  <li *ngFor="let set of sets$ | async">
    {{ set.year }} <strong>{{ set.name }}</strong> ({{ set.numParts }} parts)
  </li>
</ul>
```

```css
/* libs/angular/feature-sets/src/lib/set-list/set-list.component.css */

:host {
  font-family: sans-serif;
}

ul {
  list-style: none;
  margin: 0;
}

li {
  padding: 8px;
}

li:nth-child(2n) {
  background-color: #eee;
}

span.year {
  display: block;
  width: 20%;
}
```

```typescript
// libs/angular/feature-sets/src/lib/set-list/set-list.component.ts

import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { Set, SetListGQL } from '@nx-apollo-example/angular/data-access';
import { map } from 'rxjs/operators';

@Component({
  selector: 'nx-apollo-example-set-list',
  templateUrl: './set-list.component.html',
  styleUrls: ['./set-list.component.css']
})
export class SetListComponent {
  sets$: Observable<Set[]>;

  constructor(private setListGQL: SetListGQL) {
    this.sets$ = this.setListGQL.watch().valueChanges.pipe(map((result) => result.data.allSets));
  }
}
```

Notice how we’ve imported SetListGQL from the data-access library. This is a service generated by GraphQL Code Generator that will allow us to use the results of the SetList query we created earlier. We watch the results of this query and map them so that we get the list of sets. This entire pipeline is type-safe, using the types generated for us.

In the SetForm component, add the following:

```html
<!-- libs/angular/feature-sets/src/lib/set-form/set-form.component.html -->

<form [formGroup]="newSetForm" (submit)="createSet()">
  <label for="name">Name</label><br />
  <input formControlName="name" /><br />

  <label for="year">Year of Release</label><br />
  <input formControlName="year" /><br />

  <label for="numParts">Number of Parts</label><br />
  <input formControlName="numParts" /><br />

  <button>Create new set</button>
</form>
```

```css
/* libs/angular/feature-sets/src/lib/set-form/set-form.component.css */

form {
    font-family: sans-serif;
    border: solid 1px #eee;
    max-width: 240px;
    padding: 24px;
}

input {
    display: block;
    margin-bottom: 8px;
}
```

```typescript
// libs/angular/feature-sets/src/lib/set-form/set-form.component.ts

import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AddSetGQL, SetListDocument, SetListQuery } from '@nx-apollo-example/angular/data-access';
@Component({
  selector: 'nx-apollo-example-set-form',
  templateUrl: './set-form.component.html',
  styleUrls: ['./set-form.component.css']
})
export class SetFormComponent {
  newSetForm: FormGroup;

  constructor(private addSetGQL: AddSetGQL, private fb: FormBuilder) {

    this.newSetForm = this.fb.group(
      {
        name: ['', Validators.required],
        year: ['', Validators.required],
        numParts: [100, Validators.required]
      }
    )
  }

  createSet() {
    if (this.newSetForm.valid) {
      const newSet = { name: this.newSetForm.get('name').value, year: this.newSetForm.get('year').value, numParts: +this.newSetForm.get('numParts').value };

      this.addSetGQL.mutate(newSet)

      this.addSetGQL.mutate(newSet, {
        update: (store, result) => {
          const data: SetListQuery = store.readQuery({ query: SetListDocument });
          data.allSets = [...data.allSets, result.data.addSet];
          // Write our data back to the cache.
          store.writeQuery({ query: SetListDocument, data });
        }
      }).subscribe(() => {
        this.newSetForm.reset();
      });
    }

  }
}
```

Again, notice that we've imported services, queries, and typing information from our data-access library to accomplish this.



If your API isn’t running already, go ahead and start it:

`npm start api`

And now start your Angular app

`npm start nx-apollo-angular`

Browse to [http://localhost:4200](http://localhost:4200) and see the results of our work!
## Add React support

Let's move on to our React app. Just like with Angular, we need to add React support to our workspace:

`npm install --save-dev @nrwl/react`

## Create React libraries
Nx alllows us to break down our code into well-organized libraries for consumption by apps, so let's create a couple of React libraries to organize our work. We'll create a data-access library which will handle communication with the backend, and a feature-sets library which will include our container components for displaying the Lego set data. In a real app, we might also create a ui library which would include our reusable presentational components, but we'll leave that out in this example. We'll group both of these libraries into a react directory in libs to keep them separate from the Angular libraries we created before. For more information on how to organize your React monorepo using Nx, read our book *Effective React Development with Nx* by registering at [Nrwl Connect](https://connect.nrwl.io/).

To create the described libraries, we run these commands:

`nx generate @nrwl/react:library feature-sets --directory react --style css`

`nx generate @nrwl/react:library data-access --directory react --style css`

## Setup React Code Generation
We’ll take advantage of a tool called GraphQL Code Generator to make things a little easier. As always, first we install dependencies:

`npm install --save-dev @graphql-codegen/cli @graphql-codegen/typescript-operations @graphql-codegen/typescript-react-apollo`

We’ll need to create some queries and mutations for the frontend to consume GraphQL. Create a folder inside our data-access library named graphql with a file inside called operations.graphql:

```
# libs/react/data-access/src/lib/graphql/operations.graphql

query setList {
  allSets{
    id
    name
    numParts
    year
  }
}


mutation addSet($name: String!, $year: String!, $numParts: Int!) {
  addSet(name: $name, year: $year, numParts: $numParts) {
    id
    name
    numParts
    year
  }
}
```

To configure the code generator for React, we’ll create a file named codegen.yml in our React project:

```yaml
# libs/react/data-access/codegen.yml

overwrite: true
schema: "apps/api/src/app/schema.graphql"
generates:
  libs/react/data-access/src/lib/generated/generated.tsx:
    documents: "libs/react/data-access/src/lib/**/*.graphql"
    plugins:
      - "typescript"
      - "typescript-operations"
      - "typescript-react-apollo"
    config:
      withHooks: true
```

This configuration will grab the GraphQL schema from the api project and the operations we just created in our React library and generate all of the needed types and hooks to consume the API. 

To actually run this code generator, we’ll add a new task to our React project in our workspace:

```json
// workspace.json

{
  "version": 1,
  "projects": {
    "react-data-access": {
      ...
      "architect": {
        ...
        "generate": {
          "builder": "@nrwl/workspace:run-commands",
          "options": {
            "commands": [
              {
                "command": "npx graphql-codegen --config libs/react/data-access/codegen.yml"
              }
            ]
          }
        }
      }
    },
    ...
}
```

Now we can run that using the Nx CLI:

`nx run react-data-access:generate`

We should now have a folder called generated in our React project with a file named generated.ts. It contains typing information about the GraphQL schema and the operations we defined. It even has some hooks which will make consuming this api super-fast.

To make these available to consumers, we'll export them in the index.ts of our data-access library:

```typescript
// libs/react/data-access/src/index.ts

export * from './lib/react-data-access';
export * from './lib/generated/generated';
```

## Create React components
We now have all we need to start building our React components. We’ll create two: a list of Lego sets and a form to add a Lego set. We use the Nx CLI to build these:

`nx generate @nrwl/react:component --name=SetList --export --project=react-feature-sets --style=css`

`nx generate @nrwl/react:component --name=SetForm --export --project=react-feature-sets --style=css`

In the SetList component, add the following:

```typescript
// libs/react/feature-sets/src/lib/set-list/set-list.tsx

import React from 'react';

import './set-list.css';
import { useSetListQuery } from '@nx-apollo-example/react/data-access';

/* eslint-disable-next-line */
export interface SetListProps {}

export const SetList = (props: SetListProps) => {
  const { loading, error, data } = useSetListQuery();

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;

  return (
    <ul>
      {data.allSets.map(({ id, name, numParts, year }) => (
        <li key={id}>
          {year} - <strong>{name}</strong> ({numParts} parts)
        </li>
      ))}
    </ul>
  );
};

export default SetList;
```

```css
/* libs/react/feature-sets/src/lib/set-list/set-list.css */

ul {
  list-style: none;
  margin: 0;
  font-family: sans-serif;
  width: 100%;
}

li {
  padding: 8px;
}

li:nth-child(2n) {
  background-color: #eee;
}

span.year {
  display: block;
  width: 20%;
}
```

Notice how we’ve imported useSetListQuery. This is a hook genereated by GraphQL Code Generator that we’ll allow su to use the results of the SetList query we created earlier. This entire pipeline is typesafe, using the types generated for us.

In the SetForm component, add the following:

```typescript
// libs/react/feature-sets/src/lib/set-form/set-form.tsx

import React, { useState } from 'react';

import './set-form.css';
import { useAddSetMutation, SetListDocument} from '@nx-apollo-example/react/data-access';

/* eslint-disable-next-line */
export interface SetFormProps {}

export const SetForm = (props: SetFormProps) => {
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [numParts, setNumParts] = useState(1000);
  
  const [addSetMutation, mutationResult] = useAddSetMutation({
    variables: { name, year, numParts },
    update(cache, { data: { addSet } }) {
      const { allSets } = cache.readQuery({ query: SetListDocument });
      cache.writeQuery({
        query: SetListDocument,
        data: { allSets: allSets.concat([addSet]) }
      });
    }
  });

  const handleSubmit = event => {
    event.preventDefault();
    addSetMutation();
    setName("");
    setYear("");
    setNumParts(1000);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name:{' '}
        <input
          name="name"
          value={name}
          onChange={event => setName(event.target.value)}
        ></input>
      </label>
      <br />
      <label>
        Year:{' '}
        <input
          name="year"
          value={year}
          onChange={event => setYear(event.target.value)}
        ></input>
      </label>
      <br />
      <label>
        Number of Parts:{' '}
        <input
          name="numParts"
          value={numParts}
          onChange={event => setNumParts(+event.target.value)}
        ></input>
      </label>
      <br />
      <button>Create new set</button>
    </form>
  );
};

export default SetForm;
```

```css
/* libs/react/feature-sets/src/lib/set-form/set-form.css */

form {
    font-family: sans-serif;
    border: solid 1px #eee;
    max-width: 240px;
    padding: 24px;
}

input {
    display: block;
    margin-bottom: 8px;
}
```

## Create React App
Let’s create the React application now.

`nx generate @nrwl/react:application nx-apollo-react --style=css --routing=false`

We’ll be using the Apollo client to consume our GraphQL API, so let’s install that. 

`npm install apollo-boost @apollo/react-hooks graphql`

Modify your app.tsx to provide the Apollo Client:

```typescript
// apps/nx-apollo-react/src/app/app.tsx

import { ApolloProvider } from '@apollo/react-hooks';
import ApolloClient from 'apollo-boost';
import React from 'react';
import './app.css';

const client = new ApolloClient({
  uri: 'http://localhost:3333/graphql'
});

const App = () => (
  <ApolloProvider client={client}>
    <h1>My Lego Sets</h1>
  </ApolloProvider>
);

export default App;
```

Final step: bring those new components into our app component and add a little styling
```typescript
// apps/nx-apollo-react/src/app/app.tsx

import { ApolloProvider } from '@apollo/react-hooks';
import { SetForm, SetList } from '@nx-apollo-example/react/feature-sets';
import ApolloClient from 'apollo-boost';
import React from 'react';
import './app.css';

const client = new ApolloClient({
  uri: 'http://localhost:3333/graphql'
});

const App = () => (
  <ApolloProvider client={client}>
    <h1>My Lego Sets</h1>
    <div className="flex">
      <SetForm />
      <SetList />
    </div>
  </ApolloProvider>
);

export default App;
```

```css
/* apps/nx-apollo-react/src/app/app.css */

h1 {
  font-family: sans-serif;
  text-align: center;
}

.flex {
  display: flex;
}

SetList {
  flex: 1;
  padding: 8px;
}
```

If your API isn’t running already, go ahead and start it:

`npm start api`

And now start your React app:

`npm start nx-apollo-react`

Browse to [http:localhost:4200](http:localhost:4200ß) and see the results of our work!

## Further Reading
NestJS
- [GraphQL Quick Start](https://docs.nestjs.com/graphql/quick-start)

Apollo Angular
- [Apollo Angular Client](https://www.apollographql.com/docs/angular/)

Apollo React
- [Apollo React Client](https://www.apollographql.com/docs/react/)

GraphQL Code Generator
- [Documentation](https://graphql-code-generator.com/)
