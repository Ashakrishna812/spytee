const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { auth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

function generateSlug(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function sanitizeLayout(layout) {
  if (!Array.isArray(layout)) return [];
  return JSON.parse(JSON.stringify(layout).replace(/<script[\s\S]*?<\/script>/gi, ''));
}

router.get('/', auth, async (req, res) => {
  try {
    const posts = await Post.findAll({
      attributes: ['id', 'title', 'slug', 'status', 'excerpt', 'featuredImage', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/slug/:slug', async (req, res) => {
  try {
    const post = await Post.findOne({
      attributes: ['id', 'title', 'slug', 'seo', 'layout', 'excerpt', 'featuredImage'],
      where: { slug: req.params.slug, status: 'published' },
    });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, excerpt, featuredImage, seo } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    let slug = generateSlug(title);
    const existing = await Post.findOne({ where: { slug } });
    if (existing) slug = `${slug}-${uuidv4().slice(0, 6)}`;

    const post = await Post.create({
      title, slug,
      excerpt: excerpt || '',
      featuredImage: featuredImage || '',
      seo: seo || {},
      layout: [],
    });
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, slug, layout, seo, excerpt, featuredImage } = req.body;
    const update = {};
    if (title) update.title = title;
    if (slug !== undefined) {
      const normalized = generateSlug(slug);
      const { Op } = require('sequelize');
      const collision = await Post.findOne({
        where: { slug: normalized, id: { [Op.ne]: req.params.id } },
      });
      if (collision) return res.status(409).json({ message: 'Slug already in use by another post' });
      update.slug = normalized;
    }
    if (layout !== undefined) update.layout = sanitizeLayout(layout);
    if (seo) update.seo = seo;
    if (excerpt !== undefined) update.excerpt = excerpt;
    if (featuredImage !== undefined) update.featuredImage = featuredImage;

    await Post.update(update, { where: { id: req.params.id } });
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await Post.findByPk(req.params.id);
    if (!original) return res.status(404).json({ message: 'Post not found' });

    const slug = `${original.slug}-copy-${uuidv4().slice(0, 6)}`;
    const clone = await Post.create({
      title: `${original.title} (Copy)`,
      slug,
      status: 'draft',
      excerpt: original.excerpt || '',
      featuredImage: original.featuredImage || '',
      layout: JSON.parse(JSON.stringify(original.layout || [])),
      seo: JSON.parse(JSON.stringify(original.seo || {})),
    });
    res.status(201).json(clone);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/:id/publish', auth, async (req, res) => {
  try {
    const { action } = req.body;
    const status = action === 'unpublish' ? 'draft' : 'published';
    await Post.update({ status }, { where: { id: req.params.id } });
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    await post.destroy();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
