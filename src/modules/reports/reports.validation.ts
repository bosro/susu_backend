// src/modules/reports/reports.validation.ts
import Joi from 'joi';

export const reportsValidation = {
  query: Joi.object({
    // ✅ Make dates optional with defaults
    startDate: Joi.date().optional().default(() => {
      const date = new Date();
      date.setDate(1); // First day of current month
      return date;
    }),
    endDate: Joi.date().optional().default(() => new Date()),
    branchId: Joi.string().uuid().optional(),
    agentId: Joi.string().uuid().optional(),
    customerId: Joi.string().uuid().optional(),
    format: Joi.string().valid('json', 'csv', 'pdf').optional().default('json'),
  }).custom((value, helpers) => {
    // ✅ Validate that endDate is not before startDate
    if (value.startDate && value.endDate) {
      const start = new Date(value.startDate);
      const end = new Date(value.endDate);
      
      if (end < start) {
        return helpers.error('date.endBeforeStart', { 
          message: 'End date must be after or equal to start date' 
        });
      }
    }
    
    return value;
  }),
};