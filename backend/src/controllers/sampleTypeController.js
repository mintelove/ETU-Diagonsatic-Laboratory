/**
 * ETU Diagnostic Laboratory — Sample Type Controller
 *
 * Provides CRUD handlers for Sample Type Management.
 * Restricts mutating endpoints strictly to Administrator roles.
 */

import SampleType from '../models/SampleType.js';
import Patient from '../models/Patient.js';
import { AppError } from '../utils/appError.js';
import { recordActivity } from '../services/activityService.js';

/**
 * GET /api/sample-types
 * Returns a list of all sample types with search, sorting, and filtering.
 * Accessible to Admin, Reception, Sample Collector, and Approver.
 */
export async function listSampleTypes(req, res, next) {
  try {
    const { search, category, status, sortBy } = req.query;

    const query = {};

    // Apply Search
    if (search) {
      const cleanSearch = String(search).trim();
      if (cleanSearch) {
        query.$or = [
          { name: { $regex: cleanSearch, $options: 'i' } },
          { sampleCode: { $regex: cleanSearch, $options: 'i' } },
          { description: { $regex: cleanSearch, $options: 'i' } }
        ];
      }
    }

    // Apply Category filter
    if (category) {
      query.category = category;
    }

    // Apply Status filter
    if (status) {
      query.status = status;
    }

    let sortOptions = { name: 1 }; // Default sort
    if (sortBy) {
      switch (sortBy) {
        case 'name-asc':
          sortOptions = { name: 1 };
          break;
        case 'name-desc':
          sortOptions = { name: -1 };
          break;
        case 'price-asc':
          sortOptions = { price: 1 };
          break;
        case 'price-desc':
          sortOptions = { price: -1 };
          break;
        case 'date-asc':
          sortOptions = { createdDate: 1 };
          break;
        case 'date-desc':
          sortOptions = { createdDate: -1 };
          break;
      }
    }

    const sampleTypes = await SampleType.find(query)
      .populate('createdBy', 'fullName role')
      .sort(sortOptions)
      .lean();

    res.json({ sampleTypes });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/sample-types/:id
 * Returns details of a specific sample type.
 */
export async function getSampleType(req, res, next) {
  try {
    const sampleType = await SampleType.findById(req.params.id)
      .populate('createdBy', 'fullName role')
      .lean();

    if (!sampleType) throw new AppError('Sample type not found.', 404);

    res.json({ sampleType });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/sample-types
 * Creates a new sample type. Admin only.
 */
export async function createSampleType(req, res, next) {
  try {
    const { name, price, description, category, status } = req.body;

    // Check name uniqueness
    const existing = await SampleType.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existing) {
      throw new AppError('A sample type with this name already exists.', 422);
    }

    // Generate unique sample code
    const prefix = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    let isUnique = false;
    let sampleCode = '';
    while (!isUnique) {
      sampleCode = `SMP-${prefix || 'GEN'}-${Math.floor(100 + Math.random() * 900)}`;
      const conflict = await SampleType.findOne({ sampleCode });
      if (!conflict) isUnique = true;
    }

    const sampleType = await SampleType.create({
      name: name.trim(),
      sampleCode,
      price,
      description: description || '',
      category: category || 'Other',
      status: status || 'Active',
      available: status !== 'Inactive',
      createdBy: req.user.id
    });

    await recordActivity(
      req.user.id,
      'Created sample type',
      'SampleType',
      sampleType.id,
      `${sampleType.name} (${sampleType.sampleCode})`
    );

    res.status(201).json({ sampleType });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/sample-types/:id
 * Updates details of a sample type. Admin only.
 */
export async function updateSampleType(req, res, next) {
  try {
    const { name, price, description, category } = req.body;

    const sampleType = await SampleType.findById(req.params.id);
    if (!sampleType) throw new AppError('Sample type not found.', 404);

    // Check name uniqueness if changed
    if (name.trim().toLowerCase() !== sampleType.name.toLowerCase()) {
      const existing = await SampleType.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
      if (existing) {
        throw new AppError('A sample type with this name already exists.', 422);
      }
    }

    sampleType.name = name.trim();
    sampleType.price = price;
    sampleType.description = description || '';
    sampleType.category = category || 'Other';

    await sampleType.save();

    await recordActivity(
      req.user.id,
      'Updated sample type details',
      'SampleType',
      sampleType.id,
      `${sampleType.name} (${sampleType.sampleCode})`
    );

    res.json({ sampleType });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/sample-types/:id/status
 * Activates or deactivates a sample type. Admin only.
 */
export async function updateSampleTypeStatus(req, res, next) {
  try {
    const { status } = req.body;

    const sampleType = await SampleType.findById(req.params.id);
    if (!sampleType) throw new AppError('Sample type not found.', 404);

    sampleType.status = status;
    sampleType.available = status === 'Active';
    await sampleType.save();

    await recordActivity(
      req.user.id,
      status === 'Active' ? 'Activated sample type' : 'Deactivated sample type',
      'SampleType',
      sampleType.id,
      `${sampleType.name} (${sampleType.sampleCode})`
    );

    res.json({ sampleType });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/sample-types/:id
 * Deletes a sample type. Admin only.
 * Prevents deletion if the sample type is assigned to any patients.
 */
export async function deleteSampleType(req, res, next) {
  try {
    const sampleType = await SampleType.findById(req.params.id);
    if (!sampleType) throw new AppError('Sample type not found.', 404);

    // Check if any patients have this sample type
    const assigned = await Patient.findOne({ sampleTypes: sampleType._id });
    if (assigned) {
      throw new AppError('Cannot delete sample type. It is already associated with patient records.', 422);
    }

    await sampleType.deleteOne();

    await recordActivity(
      req.user.id,
      'Deleted sample type',
      'SampleType',
      req.params.id,
      `${sampleType.name} (${sampleType.sampleCode})`
    );

    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
