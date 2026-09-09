<?php
/**
 * Definición de rutas de la API de Sistema POS
 * Formato: 'METHOD /ruta' => 'Controller@método'
 * Los parámetros dinámicos se definen con {param}
 */

return [
    // === Autenticación ===
    'POST /api/auth/login'    => 'AuthController@login',
    'POST /api/auth/logout'   => 'AuthController@logout',
    'GET /api/auth/me'        => 'AuthController@me',

    // === Usuarios ===
    'GET /api/users'              => 'UserController@index',
    'GET /api/users/{id}'         => 'UserController@show',
    'POST /api/users'             => 'UserController@store',
    'PUT /api/users/{id}'         => 'UserController@update',
    'PATCH /api/users/{id}/toggle' => 'UserController@toggle',
    'DELETE /api/users/{id}'      => 'UserController@destroy',

    // === Categorías ===
    'GET /api/categories'              => 'CategoryController@index',
    'GET /api/categories/{id}'         => 'CategoryController@show',
    'POST /api/categories'             => 'CategoryController@store',
    'PUT /api/categories/{id}'         => 'CategoryController@update',
    'PATCH /api/categories/{id}/toggle' => 'CategoryController@toggle',
    'DELETE /api/categories/{id}'      => 'CategoryController@destroy',

    // === Subcategorías ===
    'GET /api/categories/{id}/subcategories' => 'SubcategoryController@byCategory',
    'GET /api/subcategories'                 => 'SubcategoryController@index',
    'GET /api/subcategories/{id}'            => 'SubcategoryController@show',
    'POST /api/subcategories'                => 'SubcategoryController@store',
    'PUT /api/subcategories/{id}'            => 'SubcategoryController@update',
    'PATCH /api/subcategories/{id}/toggle'   => 'SubcategoryController@toggle',
    'DELETE /api/subcategories/{id}'         => 'SubcategoryController@destroy',

    // === Productos ===
    'GET /api/products'              => 'ProductController@index',
    'GET /api/products/{id}'         => 'ProductController@show',
    'POST /api/products'             => 'ProductController@store',
    'POST /api/products/bulk-import' => 'ProductController@bulkImport',
    'PUT /api/products/{id}'         => 'ProductController@update',
    'PATCH /api/products/{id}/toggle' => 'ProductController@toggle',
    'DELETE /api/products/{id}'      => 'ProductController@destroy',
    'POST /api/products/{id}/photo'  => 'ProductController@uploadPhoto',

    // === Lotes de Producto ===
    'GET /api/products/{id}/batches'  => 'BatchController@index',
    'POST /api/products/{id}/batches' => 'BatchController@store',
    'PUT /api/batches/{id}'           => 'BatchController@update',
    'PATCH /api/batches/{id}/toggle'  => 'BatchController@toggle',
    'DELETE /api/batches/{id}'        => 'BatchController@destroy',

    // === Venta a Granel, Fraccionamiento y Mayoreo ===
    'POST /api/products/{id}/bulk-config'        => 'BulkProductController@updateBulkConfig',
    'POST /api/products/{id}/open-bulk'          => 'BulkProductController@openBulkPackage',
    'GET /api/products/{id}/bulk-history'        => 'BulkProductController@getBulkHistory',
    'GET /api/products/{id}/fractions'           => 'BulkProductController@getFractions',
    'POST /api/products/{id}/fractions'          => 'BulkProductController@saveFraction',
    'DELETE /api/products/fractions/{id}'        => 'BulkProductController@deleteFraction',
    'GET /api/products/{id}/wholesale-tiers'     => 'BulkProductController@getWholesaleTiers',
    'POST /api/products/{id}/wholesale-tiers'    => 'BulkProductController@saveWholesaleTier',
    'DELETE /api/products/wholesale-tiers/{id}'  => 'BulkProductController@deleteWholesaleTier',

    // === Paquetes y Combos Piñateros ===
    'GET /api/packages'              => 'PackageController@index',
    'GET /api/packages/{id}'         => 'PackageController@show',
    'POST /api/packages'             => 'PackageController@store',
    'PUT /api/packages/{id}'         => 'PackageController@update',
    'PATCH /api/packages/{id}/toggle' => 'PackageController@toggle',
    'DELETE /api/packages/{id}'      => 'PackageController@destroy',

    // === Catálogo de Servicios ===
    'GET /api/services'              => 'ServiceCatalogController@index',
    'GET /api/services/{id}'         => 'ServiceCatalogController@show',
    'POST /api/services'             => 'ServiceCatalogController@store',
    'PUT /api/services/{id}'         => 'ServiceCatalogController@update',
    'PATCH /api/services/{id}/toggle' => 'ServiceCatalogController@toggle',
    'DELETE /api/services/{id}'      => 'ServiceCatalogController@destroy',

    // === Pedidos Personalizados ===
    'GET /api/custom-orders'             => 'CustomOrderController@index',
    'GET /api/custom-orders/{id}'        => 'CustomOrderController@show',
    'POST /api/custom-orders'            => 'CustomOrderController@store',
    'PUT /api/custom-orders/{id}/status' => 'CustomOrderController@updateStatus',
    'POST /api/custom-orders/{id}/send'  => 'CustomOrderController@sendReceipt',

    // === Sistema de Apartados (Layaway) ===
    'GET /api/layaways'                 => 'LayawayController@index',
    'GET /api/layaways/{id}'            => 'LayawayController@show',
    'POST /api/layaways'                => 'LayawayController@store',
    'POST /api/layaways/{id}/payments'  => 'LayawayController@addPayment',
    'PATCH /api/layaways/{id}/contact'  => 'LayawayController@markContacted',
    'PUT /api/layaways/{id}/cancel'     => 'LayawayController@cancel',

    // === Ventas ===
    'POST /api/sales'        => 'SaleController@store',
    'GET /api/sales'         => 'SaleController@index',
    'GET /api/sales/{id}'    => 'SaleController@show',

    // === Tickets ===
    'GET /api/tickets/{saleId}'       => 'TicketController@show',
    'GET /api/tickets/{saleId}/pdf'   => 'TicketController@pdf',
    'POST /api/tickets/{saleId}/send' => 'TicketController@send',

    // === Caducidad (Semáforo) ===
    'GET /api/expirations'          => 'ExpirationController@index',
    'GET /api/expirations/summary'  => 'ExpirationController@summary',

    // === Dashboard y Alertas ===
    'GET /api/dashboard/stats'      => 'DashboardController@stats',
];
