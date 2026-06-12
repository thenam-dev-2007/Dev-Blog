module.exports = (objectPagination, query, countItems) => {
    objectPagination.currentPage = objectPagination.currentPage || 1;
    objectPagination.limitItem = objectPagination.limitItem || objectPagination.limitPost || 4;

    if (query.page) {
        const page = parseInt(query.page);
        if (!isNaN(page) && page > 0) {
            objectPagination.currentPage = page;
        }
    }

    if (query.limit) {
        const limit = parseInt(query.limit);
        if (!isNaN(limit) && limit > 0 && limit <= 20) {
            objectPagination.limitItem = limit;
        }
    }

    objectPagination.skip = (objectPagination.currentPage - 1) * objectPagination.limitItem;
    objectPagination.totalPage = Math.ceil(countItems / objectPagination.limitItem) || 1;

    return objectPagination;
};
