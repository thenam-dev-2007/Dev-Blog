// Route chỉ dành cho admin: GET tất cả profile
router.get('/admin/all', authenticate, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.status(200).json({
        success: true,
        count: users.length,
        data: users
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
    }
});
