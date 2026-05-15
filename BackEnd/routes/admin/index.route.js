const express = require('express');
const router = express.Router();

const postController = require('../../controllers/admin/post.controller.js');

// Routes cho quản lý bài viết
router.get('/posts', postController.index);           
router.get('/posts/:id', postController.detail);      
router.post('/posts', postController.create);          
router.patch('/posts/:id', postController.update);     
router.delete('/posts/:id', postController.delete);

module.exports = router;
