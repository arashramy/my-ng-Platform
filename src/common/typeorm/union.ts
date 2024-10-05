import {SelectQueryBuilder} from "typeorm";

export function union<T>(
    initialQueryBuilder: SelectQueryBuilder<T>,
    ...queries: SelectQueryBuilder<T>[]
): UnionParameters {
    const stringifyQuery = (
        query: UnionParameters,
        queryBuilder: SelectQueryBuilder<T>,
        index: number
    ): UnionParameters => {
        const sql = `(${queryBuilder.getQuery()})`;

        // If first recursion
        if (!index) {
            return {
                getQuery: () => sql,
                getParameters: () => queryBuilder.getParameters(),
            };
        }

        // If not first recursion
        return {
            getQuery: () => `${query.getQuery()} UNION ${sql}`,
            getParameters: () => ({
                ...queryBuilder.getParameters(),
                ...query.getParameters(),
            }),
        };
    };

    const { getQuery, getParameters } = queries.reduce(stringifyQuery, {
        getQuery: initialQueryBuilder.getQuery,
        getParameters: initialQueryBuilder.getParameters,
    });

    return {
        // Wrap final sql in parantheses to allow for table alias
        getQuery: () => `(${getQuery()})`,
        getParameters,
    };
}

interface UnionParameters {
    getQuery: () => string;
    getParameters: () => any;
}