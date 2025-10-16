import Joi from "joi";

// admin add product
const addProductSchema = Joi.object({
    vendor_article_name: Joi.string().required().messages({
        'any.required': 'Vendor artical name is required',
    }),
    category_id: Joi.number().required().messages({
        'any.required': 'Category ID is required',
        'number.base': 'Category ID must be a number'
    }),
    sub_category_id: Joi.optional().allow(),
    concern: Joi.string().optional(),
    product_image: Joi.optional(),
    category_name: Joi.optional(),
    sub_category: Joi.optional(),
    brand_image: Joi.optional(),
    faqs_option: Joi.optional().allow(),
    preference: Joi.string().optional(),
    product_video: Joi.optional(),

    skin_type: Joi.optional().allow(),
    hair_type: Joi.optional().allow(),
    spf_type: Joi.optional().allow(),
    size_chart_type: Joi.optional().allow(),
    color: Joi.optional().allow(),
    flavour: Joi.optional().allow(),
    protein_type: Joi.optional().allow(),
    diaper_style: Joi.optional().allow(),
    formulation_type: Joi.optional().allow(),
    staging: Joi.optional().allow(),


    sub_sub_category_id:Joi.optional().allow(),
    sub_sub_sub_category_id:Joi.optional().allow(),
    vendor_sku_code: Joi.string().required().messages({
        'any.required': 'Vendor SKU Code is required'
    }),
    vendor_article_number: Joi.string().optional(),
    hsn: Joi.number().integer().min(10000000).max(99999999).required(),


    url: Joi.string().required().messages({
        'any.required': 'Product URL (url) is required'
    }),

    brand: Joi.number().required().messages({
        'any.required': 'Brand ID is required',
        'number.base': 'Category ID must be a number'
    }),

    manufacturer_name_and_address_with_pincode: Joi.string().required().messages({
        'any.required': 'manufacturer_name_and_address_with_pincode is required'
    }),

    packer_name_and_address_with_pincode: Joi.string().required().messages({
        'any.required': 'packer_name_and_address_with_pincode  is required'
    }),

    importer_name_and_address_with_pincode: Joi.string().optional().allow(""),

    country_of_origin: Joi.string().required().messages({
        'any.required': 'country_of_origin is required'
    }),

    weight_kg: Joi.number().required().messages({
        'any.required': 'weight_kg  is required'
    }),

    dimensions_cm: Joi.string().required(),
    checkout: Joi.string().optional(),

    components: Joi.string().required(),

    expires_on_or_after_dd_mm_yyyy: Joi.string().optional(),

    expires_in_days: Joi.number().optional().messages({
        'any.required': 'expires_in_days is required'
    }),

    article_type: Joi.string().required(),
    brand_size: Joi.string().required(),
    standard_size: Joi.string().required(),
    sku_code: Joi.string().optional().allow(""),

    age_group: Joi.string().optional(),
    min_age_years: Joi.number().required().messages({
        'any.required': 'min_age_years is required'
    }),
    max_age_years: Joi.number().required().messages({
        'any.required': 'max_age_years is required'
    }),
    product_highlights: Joi.string().required().messages({
        'any.required': 'product_highlights is required'
    }),
    description: Joi.string().required().messages({
        'any.required': 'description is required'
    }),


    product_benefits: Joi.string().optional().allow(""),
    directions_of_use: Joi.string().required().messages({
        'any.required': 'directions_of_use is required'
    }),
    safety_information: Joi.string().required().messages({
        'any.required': 'safety_information is required'
    }),
    tags: Joi.optional(),
    special_features: Joi.string().optional().allow(""),
    mrp: Joi.number().required().messages({
        'any.required': 'mrp is required'
    }),
    discount_in_percent: Joi.number().optional(),
    discount_in_amount: Joi.number().optional(),
    status: Joi.string().required().messages({
        'any.required': 'status is required'
    }),
    new_arrival: Joi.number().optional().messages({
        'number.base': 'It must be a number'
    }),
    show_stock: Joi.number().optional().messages({
        'number.base': 'It must be a number'
    }),
    top_picks: Joi.number().optional().messages({
        'number.base': 'It must be a number'
    }),
    ranking: Joi.number().optional().messages({
        'number.base': 'Sort order value must be 0 or greater'
    }),
    toppics_ranking: Joi.number().optional().messages({
        'number.base': 'Top Picks order value must be 0 or greater.'
    }),
    newarrival_ranking: Joi.number().optional().messages({
        'number.base': 'New Arrival order value must be 0 or greater.'
    }),
    name: Joi.optional(),
    stock_status: Joi.string().required(),
    meta_description: Joi.string().optional(),
    meta_title: Joi.string().optional(),

    back_order_quantity: Joi.optional(),
    max_order_quantity: Joi.optional(),

    min_order_quantity: Joi.optional(),

    other_ingredients: Joi.string().optional(),
    key_ingredients: Joi.string().optional(),
    checkout: Joi.string().optional(),

    // new fields
    expert_advice: Joi.string().optional().allow(),
    specifications: Joi.string().optional().allow(),
    feeding_table: Joi.string().optional().allow(),
    size_chart: Joi.optional().allow()

})
// user 
const addComment = Joi.object({
    blogId: Joi.number().required().messages({
        'any.required': 'Blog id required',
    }),
    comment: Joi.string().required().messages({
        'any.required': 'Comment is required'
    }),
    user_name: Joi.string().optional(),
    user_email: Joi.string().optional()

})


//admin insert curated prodcuts
const insertCuratedProduct = Joi.object({
    name: Joi.string().required().messages({
        'any.required': 'Name is  required',
    }),
    image: Joi.string().required().messages({
        'any.required': 'Image is  required',
    }),
    slug_name: Joi.string().required().messages({
        'any.required': 'Slug Name is  required',
    }),
    status: Joi.string().valid('Active', 'In-Active').required().messages({
        'any.required': 'Status should be Active/In-Active',
    }),
    id: Joi.number().optional()
})

//products export 
const exportproduct = Joi.object({
    list: Joi.array().items(
        Joi.string().valid('product_id', 'vendor_sku_code', 'sku_code','vendor_article_name','mrp','discount_percent','discount_amount','final_price','url','slug','brand','category_id','sub_category_id','sub_sub_category_id','country_of_origin','importer_name_and_address_with_pincode','packer_name_and_address_with_pincode','manufacturer_name_and_address_with_pincode','expires_in_days','components','meta_title','meta_description','stock_status','dimensions_cm','weight_kg','concern_1','concern_2','concern_3',"preference_1","preference_2","preference_3",'article_type','brand_size','standard_size','hsn','age_group','min_age_years','max_age_years','directions_of_use','description','product_benefits','product_highlights','safety_information','special_features','tags','key_ingredients','other_ingredients','min_order_quantity','max_order_quantity','back_order_quantity','checkout','status','top_picks','new_arrival','ranking','expert_advice','accessories_specification','feeding_table','size_chart')
     ).required().messages({
        'any.required': 'Array should contain at least one value',
        'array.includesRequiredUnknowns': 'Array should only contain predefined values',
    })
})
// export default addProductSchema;

//add size product schema

const skuCodeRegex = /^[A-Z0-9/]*$/;
const addSizeProductSchema = Joi.object({
    vendor_article_name: Joi.string().required().messages({
        'any.required': 'Vendor artical name is required',
    }),
    vendor_sku_code: Joi.string().required().messages({
        'any.required': 'Vendor SKU Code is required'
    }),
    mrp: Joi.number().required().messages({
        'any.required': 'mrp is required'
    }),
    discount_in_percent: Joi.number().optional(),
    discount_in_amount: Joi.number().optional(),
    back_order_quantity: Joi.optional(),
    max_order_quantity: Joi.optional(),
    sku_code: Joi.string().pattern(skuCodeRegex).messages({
        'string.pattern.base': 'Allow only Upper-case Alphabet, / and numbers only',
      }).allow('').optional(),
    meta_description: Joi.string().optional(),
    meta_title: Joi.string().optional(),
    url: Joi.string().optional(),
    min_order_quantity: Joi.optional(),
    weight_kg: Joi.number().required().messages({
        'any.required': 'weight_kg  is required'
    }),

    dimensions_cm: Joi.string().required(),
    product_image: Joi.optional(),
    id: Joi.number().required(),
    brand_size: Joi.string().required(),
    status: Joi.string().required().messages({
        'any.required': 'status is required'
    }),
    ptype: Joi.string().required().messages({
        'any.required': 'Product Type is required'
    })


})

const addRequst = Joi.object({
    name: Joi.string().required().messages({
        'any.required': 'Name is required'
    }),
    email: Joi.string().required().messages({
        'any.required': 'Email required',
    }),
    mobile: Joi.string().required().messages({
        'any.required': 'Mobile Number is required'
    }),
    subject: Joi.string().required().messages({
        'any.required': 'Subject is required'
    }),
    message: Joi.string().required().messages({
        'any.required': 'Message is required'
    })
 
})

// addSingle add 

const addSingleAdd = Joi.object({
    image: Joi.string().required().messages({
        'any.required': 'Image is required'
    }),
    url: Joi.string().required().messages({
        'any.required': 'URL is required',
    })

})

const editSingleAdd = Joi.object({
    image: Joi.string().required().messages({
        'any.required': 'Image is required'
    }),
    url: Joi.string().required().messages({
        'any.required': 'URL is required',
    }),
    updated_by: Joi.string().required().messages({
        'any.required': 'Image is required'
    }),
    status: Joi.string().required().messages({
        'any.required': 'URL is required',
    })

})
const addCuratedAdd = Joi.object({
    image: Joi.string().required().messages({
        'any.required': 'Image is required'
    }),
    url: Joi.string().required().messages({
        'any.required': 'URL is required',
    }),
    type: Joi.string()
    .valid('CURATED', 'YOURSELF')
    .required()
    .messages({
        'any.required': 'Type is required',
        'any.only': 'Type must be one of [curated, yourself]',
    }),
    products: Joi.string().required().messages({
        'any.required': 'Products are required',
    }),
    status: Joi.string()
    .valid('Active', 'In-Active', 'Deleted')
    .required()
    .messages({
        'any.required': 'Status is required',
        'any.only': 'Status must be one of [Active, In-Active, Deleted]',
    }),
    
})
const editCuratedAdd = Joi.object({
    updated_by: Joi.string().required().messages({
        'any.required': 'Updated BY is required'
    }),
    image: Joi.string().required().messages({
        'any.required': 'Image is required'
    }),
    url: Joi.string().required().messages({
        'any.required': 'URL is required',
    }),
    type: Joi.string()
    .valid('CURATED', 'YOURSELF')
    .required()
    .messages({
        'any.required': 'Type is required',
        'any.only': 'Type must be one of [curated, yourself]',
    }),
    products: Joi.string().required().messages({
        'any.required': 'Products are required',
    }),
    status: Joi.string()
    .valid('Active', 'In-Active', 'Deleted')
    .required()
    .messages({
        'any.required': 'Status is required',
        'any.only': 'Status must be one of [Active, In-Active, Deleted]',
    }),
})

const employeeAdd = Joi.object({
    created_by: Joi.string().required().messages({
        'any.required': 'Created BY is required'
    }),
    email: Joi.string().required().messages({
        'any.required': 'Email is required'
    }),
    first_name: Joi.string().required().messages({
        'any.required': 'First Name is required',
    }),
    last_name: Joi.string().required().messages({
        'any.required': 'Last Name is required',
    }),
    roles: Joi.array().required().messages({
        'any.required': 'Roles are required',
    }),
    password: Joi.string().required().messages({
        'any.required': 'Password is required',
    }),
    status: Joi.string()
        .valid('Active', 'In-Active', 'Deleted')
        .required()
        .messages({
            'any.required': 'Status is required',
            'any.only': 'Status must be one of [Active, In-Active, Deleted]',
        }),
})
const employeeEdit = Joi.object({
    updated_by: Joi.string().required().messages({
        'any.required': 'Updqated BY is required'
    }),
    email: Joi.string().required().messages({
        'any.required': 'Email is required'
    }),
    first_name: Joi.string().required().messages({
        'any.required': 'First Name is required',
    }),
    last_name: Joi.string().required().messages({
        'any.required': 'Last Name is required',
    }),
    roles: Joi.array().required().messages({
        'any.required': 'Roles are required',
    }),
    status: Joi.string()
        .valid('Active', 'In-Active', 'Deleted')
        .required()
        .messages({
            'any.required': 'Status is required',
            'any.only': 'Status must be one of [Active, In-Active, Deleted]',
        }),
})

const addUserWallet = Joi.object({
    txn_type: Joi.string().valid('CREDIT', 'DEBIT').required().messages({
        'any.required': 'Transaction Type  is required',
        'any.only': 'Invalid transaction type. Allowed values are CREDIT, DEBIT'
    }),
    amount: Joi.string().required().messages({
        'any.required': 'Amount required',
    }),
    transaction_id: Joi.string().required().messages({
        'any.required': 'Transaction ID is required'
    }),
    userId: Joi.number().required().messages({
        'any.required': 'User ID is required',
        'number.base': 'Uset ID must be a number'
    }),
     order_id: Joi.number().required().messages({
        'any.required': 'User ID is required',
        'number.base': 'Uset ID must be a number'
    })
 
})

const popupAdd = Joi.object({
    created_by: Joi.string().required().messages({
        'any.required': 'Created BY is required'
    }),
    image: Joi.string().required().messages({
        'any.required': 'Image is required'
    }),
    coupon_code:Joi.optional().allow(),
    name:Joi.optional().allow(),
    product_id:Joi.optional().allow(),
    category:Joi.optional().allow(),
    brand:Joi.optional().allow(),
    concern:Joi.optional().allow(),
    time_lag:Joi.optional().allow(),
    count_down:Joi.optional().allow(),
    page_type:Joi.optional().allow(),
    link:Joi.optional().allow(),
    status: Joi.string()
    .valid('Active', 'In-Active', 'Deleted')
    .required()
    .messages({
        'any.required': 'Status is required',
        'any.only': 'Status must be one of [Active, In-Active, Deleted]',
    }),
})
const popupEdit = Joi.object({
    updated_by: Joi.string().required().messages({
        'any.required': 'Updated BY is required'
    }),
    image: Joi.string().required().messages({
        'any.required': 'Image is required'
    }),
    coupon_code:Joi.optional().allow(),
    name:Joi.optional().allow(),
    product_id:Joi.optional().allow(),
    category:Joi.optional().allow(),
    brand:Joi.optional().allow(),
    concern:Joi.optional().allow(),
    time_lag:Joi.optional().allow(),
    count_down:Joi.optional().allow(),
    page_type:Joi.optional().allow(),
    link:Joi.optional().allow(),
    status: Joi.string()
    .valid('Active', 'In-Active', 'Deleted')
    .required()
    .messages({
        'any.required': 'Status is required',
        'any.only': 'Status must be one of [Active, In-Active, Deleted]',
    }),
})



export {
    addComment, addCuratedAdd, addProductSchema, addRequst, addSingleAdd, addSizeProductSchema, addUserWallet, editCuratedAdd, editSingleAdd, employeeAdd, employeeEdit, exportproduct, insertCuratedProduct, popupAdd, popupEdit
};

