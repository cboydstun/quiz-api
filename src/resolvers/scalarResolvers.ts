import { IResolvers } from '@graphql-tools/utils';
import { GraphQLScalarType, Kind } from 'graphql';

const scalarResolvers: Pick<IResolvers, 'Date'> = {
    Date: new GraphQLScalarType({
        name: 'Date',
        description: 'Date custom scalar type',
        serialize(value: Date) {
            return value.getTime();
        },
        parseValue(value: number) {
            return new Date(value);
        },
        parseLiteral(ast) {
            if (ast.kind === Kind.INT) {
                return new Date(parseInt(ast.value, 10));
            }
            return null;
        },
    }),
};

export default scalarResolvers;