module.exports = (objectPagination, query, countItems) => {
    if(query.page) {
        const page = parseInt(query.page);
        if(page > 0) {
            objectPagination.currentPage = page;
        }
    }

    if(query.limit) {
        const limit = parseInt(query.limit);

        if(limit > 0 && limit <= 20) {
            objectPagination.limitItem = limit;
        }
    }

    objectPagination.skip = (objectPagination.currentPage - 1) * objectPagination.limitItem 

    const totalPage = Math.ceil(countItems / objectPagination.limitItem)
    objectPagination.totalPage = totalPage

    return objectPagination
}