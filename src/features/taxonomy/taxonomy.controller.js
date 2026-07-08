import { asyncHandler } from '../../utils/asyncHandler.js';
import { getTaxonomyCategories } from './taxonomyCategories.js';

export const listTaxonomyCategories = asyncHandler(async (req, res) => {
    res.status(200).json({ data: getTaxonomyCategories() });
});
