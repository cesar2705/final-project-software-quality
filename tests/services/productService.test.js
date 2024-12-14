// Mock the models before requiring the service
jest.mock('../../models/product', () => ({
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    belongsTo: jest.fn()  // Mock the association method
  }));

  jest.mock('../../models/category', () => ({
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  }));

  // Now require the service after the mocks are set up
  const { Op } = require('sequelize'); // Importar Op desde Sequelize: Objeto de Sequelize que se usa para hacer comparaciones más complejas en las consultas, como el operador IN.
  const ProductService = require('../../services/productService');
  const Product = require('../../models/product');
  const Category = require('../../models/category');

describe('ProductService', () => {
    // Clear all mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllProducts', () => {
        it('should return all products', async () => {
            const mockProducts = [{ id: 1, name: 'Product A' }, { id: 2, name: 'Product B' }];
            // Simulamos la respuesta del modelo Product
            Product.findAll.mockResolvedValue(mockProducts);

            // Llamamos al método que estamos probando
            const result = await ProductService.getAllProducts();

            // Verificamos que el método findAll fue llamado correctamente
            expect(Product.findAll).toHaveBeenCalledTimes(1);
            // Comprobamos que el resultado es el esperado
            expect(result).toEqual(mockProducts);
        });
    });

    describe('getProductById', () => {
        it('should return a product when product exists', async () => {
            const mockProduct = { id: 1, name: 'Product A' };
            // Simulamos que se encuentra un producto con id 1
            Product.findByPk.mockResolvedValue(mockProduct);

            // Llamamos al método que estamos probando
            const result = await ProductService.getProductById(1);

            // Verificamos que el método findByPk fue llamado con el id correcto
            expect(Product.findByPk).toHaveBeenCalledWith(1);
            // Comprobamos que el resultado es el esperado
            expect(result).toEqual(mockProduct);
        });

        it('should return null when product does not exist', async () => {
            // Simulamos que no se encuentra un producto con id 99
            Product.findByPk.mockResolvedValue(null);

            const result = await ProductService.getProductById(99);

            // Verificamos que findByPk fue llamado con el id 99
            expect(Product.findByPk).toHaveBeenCalledWith(99);
            // Comprobamos que el resultado es null
            expect(result).toBeNull();
        });
    });

    describe('createProduct', () => {
        it('should create a product when category exists', async () => {
            const mockCategory = { id: 1, name: 'Category A' };
            const mockProduct = { id: 1, name: 'Product A', categoryId: 1 };

            // Simulamos que la categoría existe en la base de datos
            Category.findByPk.mockResolvedValue(mockCategory);
            // Simulamos la creación del producto
            Product.create.mockResolvedValue(mockProduct);

            // Llamamos al método para crear el producto
            const result = await ProductService.createProduct(mockProduct);

            // Verificamos que se haya llamado a la búsqueda de la categoría
            expect(Category.findByPk).toHaveBeenCalledWith(1);
            // Verificamos que se haya llamado al método de creación de producto
            expect(Product.create).toHaveBeenCalledWith(mockProduct);
            // Comprobamos que el resultado es el esperado
            expect(result).toEqual(mockProduct);
        });

        it('should throw an error when category does not exist', async () => {
            // Simulamos que no se encuentra la categoría
            Category.findByPk.mockResolvedValue(null);

            // Verificamos que se lance un error si no existe la categoría
            await expect(ProductService.createProduct({ categoryId: 99 }))
                .rejects
                .toThrow('Category with id 99 does not exist');

            // Verificamos que no se haya llamado a crear el producto
            expect(Product.create).not.toHaveBeenCalled();
        });

        // Para mejorar cobertura de ...
        it('should throw an error if product creation fails', async () => {
            const mockCategory = { id: 1, name: 'Category A' };
            const mockProduct = { id: 1, name: 'Product A', categoryId: 1 };

            // Simulamos que la categoría existe pero ocurre un error al crear el producto
            Category.findByPk.mockResolvedValue(mockCategory);
            Product.create.mockRejectedValue(new Error('Database error'));

            // Verificamos que se lance un error
            await expect(ProductService.createProduct(mockProduct))
                .rejects
                .toThrow('Database error');

            expect(Category.findByPk).toHaveBeenCalledWith(1);
            expect(Product.create).toHaveBeenCalledWith(mockProduct);
        });
    });

    describe('getProductsByCategory', () => {
        it('should return products by category', async () => {
            const mockProducts = [{ id: 1, name: 'Product A', categoryId: 1 }];
            // Simulamos que la base de datos devuelve productos para una categoría
            Product.findAll.mockResolvedValue(mockProducts);

            const result = await ProductService.getProductsByCategory(1);

            // Verificamos que se haya llamado al método con la categoría correcta
            expect(Product.findAll).toHaveBeenCalledWith({
                where: { categoryId: 1 },
                include: Category,
            });
            expect(result).toEqual(mockProducts);
        });

        // PARA MEJORAR COBERTURAS
        it('should return products by category without optional parameters (sort, limit, offset)', async () => {
            // Mocking the Product model's findAll method
            Product.findAll.mockResolvedValue([{ id: 1, name: 'Product 1' }, { id: 2, name: 'Product 2' }]);
      
            const result = await ProductService.getProductsByCategory(1);
            
            expect(result).toBeDefined();
            expect(result.length).toBe(2);
            expect(Product.findAll).toHaveBeenCalledWith({
              where: { categoryId: 1 },
              include: Category
            });
          });
      
        it('should return products sorted by price in descending order', async () => {
        // Mocking the Product model's findAll method
        Product.findAll.mockResolvedValue([{ id: 1, name: 'Product 1' }, { id: 2, name: 'Product 2' }]);
    
        const result = await ProductService.getProductsByCategory(1, { sort: 'price,DESC' });
    
        expect(result).toBeDefined();
        expect(Product.findAll).toHaveBeenCalledWith({
            where: { categoryId: 1 },
            include: Category,
            order: [['price', 'DESC']]
        });
        });

        it('should return paginated products', async () => {
            // Mocking the Product model's findAll method
            Product.findAll.mockResolvedValue([{ id: 1, name: 'Product 1' }, { id: 2, name: 'Product 2' }]);
        
            const result = await ProductService.getProductsByCategory(1, { limit: 10, offset: 5 });
        
            expect(result).toBeDefined();
            expect(Product.findAll).toHaveBeenCalledWith({
                where: { categoryId: 1 },
                include: Category,
                limit: 10,
                offset: 5
            });
        });
    });

    describe('getProductsByCategories', () => {
        it('should return products by categories', async () => {
            const mockProducts = [
                { id: 1, name: 'Product A', categoryId: 1 },
                { id: 2, name: 'Product B', categoryId: 2 },
            ];
            // Simulamos que la base de datos devuelve productos para varias categorías
            Product.findAll.mockResolvedValue(mockProducts);

            const result = await ProductService.getProductsByCategories('1,2');

            // Verificamos que se haya llamado al método con las categorías correctas
            expect(Product.findAll).toHaveBeenCalledWith({
                where: { categoryId: { [Op.in]: [1, 2] } },
                include: Category
            });
            expect(result).toEqual(mockProducts);
        });

        it('should throw an error if categories parameter is missing', async () => {
            // Verificamos que se lance un error si el parámetro de categorías está vacío
            await expect(ProductService.getProductsByCategories('')).rejects.toThrow('Categories parameter is required');
            expect(Product.findAll).not.toHaveBeenCalled();
        });

        // PARA MEJORAR COBERTURAS
        it('should throw an error when categories parameter is empty', async () => {
            await expect(ProductService.getProductsByCategories('')).rejects.toThrow('Categories parameter is required');
          });
      
          it('should return products by multiple categories', async () => {
            // Mocking the Product model's findAll method
            Product.findAll.mockResolvedValue([{ id: 1, name: 'Product 1' }, { id: 2, name: 'Product 2' }]);
      
            const result = await ProductService.getProductsByCategories('1,2,3');
            
            expect(result).toBeDefined();
            expect(Product.findAll).toHaveBeenCalledWith({
              where: {
                categoryId: { [Op.in]: [1, 2, 3] }
              },
              include: Category
            });
          });
      
          it('should return products sorted by price in ascending order', async () => {
            // Mocking the Product model's findAll method
            Product.findAll.mockResolvedValue([{ id: 1, name: 'Product 1' }, { id: 2, name: 'Product 2' }]);
      
            const result = await ProductService.getProductsByCategories('1,2,3', { sort: 'price,ASC' });
      
            expect(result).toBeDefined();
            expect(Product.findAll).toHaveBeenCalledWith({
              where: {
                categoryId: { [Op.in]: [1, 2, 3] }
              },
              include: Category,
              order: [['price', 'ASC']]
            });
          });
      
          it('should return paginated products with limit and offset', async () => {
            // Mocking the Product model's findAll method
            Product.findAll.mockResolvedValue([{ id: 1, name: 'Product 1' }, { id: 2, name: 'Product 2' }]);
      
            const result = await ProductService.getProductsByCategories('1,2,3', { limit: 5, offset: 2 });
      
            expect(result).toBeDefined();
            expect(Product.findAll).toHaveBeenCalledWith({
              where: {
                categoryId: { [Op.in]: [1, 2, 3] }
              },
              include: Category,
              limit: 5,
              offset: 2
            });
          });
    });

    describe('updateProduct', () => {
        it('should update a product', async () => {
            const mockProduct = { id: 1, name: 'Updated Product' };

            // Simulamos que la categoría existe en la base de datos
            Category.findByPk.mockResolvedValue({ id: 1, name: 'Category A' });
            // Simulamos que el producto se actualiza correctamente
            Product.update.mockResolvedValue([1]); // Simulamos que una fila fue actualizada

            const result = await ProductService.updateProduct(1, mockProduct);

            // Verificamos que se haya llamado al método update con el producto actualizado
            expect(Product.update).toHaveBeenCalledWith(mockProduct, { where: { id: 1 } });
            expect(result).toEqual([1]);
        });

        it('should throw an error if category does not exist when updating', async () => {
            // Simulamos que la categoría no existe
            Category.findByPk.mockResolvedValue(null);

            const productData = { categoryId: 999 };
            await expect(ProductService.updateProduct(1, productData))
                .rejects
                .toThrow('Category with id 999 does not exist');

            // Verificamos que no se haya llamado a actualizar el producto
            expect(Product.update).not.toHaveBeenCalled();
        });

        
        it('should update product if categoryId is not provided', async () => {
            Product.update.mockResolvedValue([1]);
    
            const productData = { name: 'New Product Name' };
            const result = await ProductService.updateProduct(1, productData);
    
            expect(result).toEqual([1]);
        });
        
    });

    describe('deleteProduct', () => {
        it('should delete a product', async () => {
             // Simulamos que el producto fue eliminado correctamente
             Product.destroy.mockResolvedValue(1); // Simulamos que una fila fue eliminada

             const result = await ProductService.deleteProduct(1);
 
             // Verificamos que se haya llamado al método destroy con el id correcto
             expect(Product.destroy).toHaveBeenCalledWith({ where: { id: 1 } });
             expect(result).toBe(1);
         });
 
         it('should return 0 if no product is deleted', async () => {
             // Simulamos que no se eliminó ningún producto
             Product.destroy.mockResolvedValue(0);
 
             const result = await ProductService.deleteProduct(99);
 
             // Verificamos que se haya llamado al método destroy con el id correcto
             expect(Product.destroy).toHaveBeenCalledWith({ where: { id: 99 } });
             expect(result).toBe(0);
        });
        
    });

    // Pruebas para errores inesperados por ejemplo: fallos de la BD.
    it('should handle database errors gracefully', async () => {
        // Simula un fallo de la base de datos
        Product.findAll.mockRejectedValue(new Error('Database error'));

        // Verifica que se lance la excepción esperada
        await expect(ProductService.getAllProducts()).rejects.toThrow('Database error');
    });


    // PARA MEJORAR COBERTURA
    // Test for getProductsByCategory with sort
    it('getProductsByCategory orders products correctly with sort parameter', async () => {
        const mockCategory = { id: 1, name: 'Electronics' };
        const mockProducts = [
            { id: 1, name: 'Product A', price: 10, categoryId: 1 },
            { id: 2, name: 'Product B', price: 20, categoryId: 1 },
        ];

        // Mocking Category.findByPk and Product.findAll
        Category.findByPk = jest.fn().mockResolvedValue(mockCategory);
        Product.findAll = jest.fn().mockResolvedValue(mockProducts);

        const sort = 'price,DESC'; // Sort by price, descending
        const options = { sort };

        const result = await ProductService.getProductsByCategory(1, options);

        expect(result).toEqual(mockProducts);
        expect(Product.findAll).toHaveBeenCalledWith({
            where: { categoryId: 1 },
            include: Category,
            order: [['price', 'DESC']], // Check that the order is applied correctly
        });
    });
    // Test for getProductsByCategory with default ASC sort direction
    it('getProductsByCategory orders products with default ASC direction', async () => {
        const mockCategory = { id: 1, name: 'Electronics' };
        const mockProducts = [
            { id: 1, name: 'Product A', price: 10, categoryId: 1 },
            { id: 2, name: 'Product B', price: 20, categoryId: 1 },
        ];

        Category.findByPk = jest.fn().mockResolvedValue(mockCategory);
        Product.findAll = jest.fn().mockResolvedValue(mockProducts);

        const sort = 'price'; // Sort by price, default to ASC
        const options = { sort };

        const result = await ProductService.getProductsByCategory(1, options);

        expect(result).toEqual(mockProducts);
        expect(Product.findAll).toHaveBeenCalledWith({
            where: { categoryId: 1 },
            include: Category,
            order: [['price', 'ASC']], // Default to ASC if no direction provided
        });
    });

    // Test for getProductsByCategories with sort
    it('getProductsByCategories orders products correctly with sort parameter', async () => {
        const mockCategory = { id: 1, name: 'Electronics' };
        const mockProducts = [
            { id: 1, name: 'Product A', price: 10, categoryId: 1 },
            { id: 2, name: 'Product B', price: 20, categoryId: 1 },
        ];

        Category.findByPk = jest.fn().mockResolvedValue(mockCategory);
        Product.findAll = jest.fn().mockResolvedValue(mockProducts);

        const sort = 'price,DESC'; // Sort by price, descending
        const options = { sort };

        const result = await ProductService.getProductsByCategories('1,2', options);

        expect(result).toEqual(mockProducts);
        expect(Product.findAll).toHaveBeenCalledWith({
            where: {
                categoryId: { [Op.in]: [1, 2] },
            },
            include: Category,
            order: [['price', 'DESC']], // Check that the order is applied correctly
        });
    });

    // Test for getProductsByCategories with default ASC sort direction
    it('getProductsByCategories orders products with default ASC direction', async () => {
        const mockCategory = { id: 1, name: 'Electronics' };
        const mockProducts = [
            { id: 1, name: 'Product A', price: 10, categoryId: 1 },
            { id: 2, name: 'Product B', price: 20, categoryId: 1 },
        ];

        Category.findByPk = jest.fn().mockResolvedValue(mockCategory);
        Product.findAll = jest.fn().mockResolvedValue(mockProducts);

        const sort = 'price'; // Sort by price, default to ASC
        const options = { sort };

        const result = await ProductService.getProductsByCategories('1,2', options);

        expect(result).toEqual(mockProducts);
        expect(Product.findAll).toHaveBeenCalledWith({
            where: {
                categoryId: { [Op.in]: [1, 2] },
            },
            include: Category,
            order: [['price', 'ASC']], // Default to ASC if no direction provided
        });
    });


});
