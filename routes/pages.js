const express = require('express');
const router = express.Router();
const Page = require('../models/Page');
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
    const pages = await Page.findAll({
      attributes: ['id', 'title', 'slug', 'status', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json(pages);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const page = await Page.findByPk(req.params.id);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    res.json(page);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/slug/:slug', async (req, res) => {
  try {
    const page = await Page.findOne({
      attributes: ['id', 'title', 'slug', 'seo', 'layout'],
      where: { slug: req.params.slug, status: 'published' },
    });
    if (!page) return res.status(404).json({ message: 'Page not found' });
    res.json(page);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, seo } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    let slug = generateSlug(title);
    const existing = await Page.findOne({ where: { slug } });
    if (existing) slug = `${slug}-${uuidv4().slice(0, 6)}`;

    const page = await Page.create({ title, slug, seo: seo || {}, layout: [] });
    res.status(201).json(page);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, slug, layout, seo } = req.body;
    const update = {};
    if (title) update.title = title;
    if (slug !== undefined) {
      const normalized = generateSlug(slug);
      const { Op } = require('sequelize');
      const collision = await Page.findOne({
        where: { slug: normalized, id: { [Op.ne]: req.params.id } },
      });
      if (collision) return res.status(409).json({ message: 'Slug already in use by another page' });
      update.slug = normalized;
    }
    if (layout !== undefined) update.layout = sanitizeLayout(layout);
    if (seo) update.seo = seo;

    await Page.update(update, { where: { id: req.params.id } });
    const page = await Page.findByPk(req.params.id);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    res.json(page);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await Page.findByPk(req.params.id);
    if (!original) return res.status(404).json({ message: 'Page not found' });

    const slug = `${original.slug}-copy-${uuidv4().slice(0, 6)}`;
    const clone = await Page.create({
      title: `${original.title} (Copy)`,
      slug,
      status: 'draft',
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
    await Page.update({ status }, { where: { id: req.params.id } });
    const page = await Page.findByPk(req.params.id);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    res.json(page);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const page = await Page.findByPk(req.params.id);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    await page.destroy();
    res.json({ message: 'Page deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
