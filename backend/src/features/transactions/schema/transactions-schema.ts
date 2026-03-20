import Joi from 'joi';

const cartProductSchema = Joi.object().keys({
  inventoryId: Joi.string().uuid().required(), // `inventoryId` as UUID (required)
  quantity: Joi.number().min(1).required(), // `quantity` (positive number, min 1)
  productName: Joi.string().min(1).max(255).required(), // `productName` (non-empty string)
  price: Joi.number().precision(2).min(0).required(), // `price` (positive number with 2 decimals)
  VAT: Joi.number().precision(2).min(0).required(), // `VAT` (non-negative number with 2 decimals)
  discount: Joi.number().precision(2).min(0).required(), // `discount` (non-negative number with 2 decimals) 
  status: Joi.string().allow(null),
  stock_quantity: Joi.number().min(0).required(), // `stock_quantity` (non-negative number)
  supplier_products_id: Joi.string().uuid().required(), // `supplier_products_id` as UUID (required)
  total_stock_quantity: Joi.number().min(0).required(),
  needsBatchLoad: Joi.boolean().required()
});



export const transactionSchema = Joi.object().keys({
  cartProducts: Joi.array().items(cartProductSchema).required(), // Array of `cartProducts` (required)
  statusTab: Joi.boolean().required(), // `statusTab` (boolean, required)
  totalCost: Joi.object()
    .keys({
      total: Joi.number().precision(2).min(0).required(), // `total` (non-negative number with 2 decimals)
      subtotal: Joi.number().precision(2).min(0).required() // `subtotal` (non-negative number with 2 decimals)
    })
    .required(), // `totalCost` (required)
  paymentMethod: Joi.string().valid('CASH', 'BANK', 'CREDIT', 'SPLIT', 'MPESA').required(), // `paymentMethod` (valid string values)
  customerId: Joi.string().uuid().allow(null), // `customerId` (UUID, can be null or omitted)
  payments: Joi.when('paymentMethod', {
    is: 'SPLIT',
    then: Joi.array()
      .items(
        Joi.object({
          paymentType: Joi.string()
            .valid('CASH', 'BANK', 'CREDIT', 'MPESA')
            .required(),

          amount: Joi.number().precision(2).greater(0).required(),

          reference: Joi.when('paymentType', {
            is: 'MPESA',
            then: Joi.string().required(),
            otherwise: Joi.forbidden()
          })
        })
      )
      .min(1)
      .required(),

    otherwise: Joi.forbidden()
  })
});
