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
        it('Debería devolver todos los productos', async () => {
            const mockProducts = [{ id: 1, name: 'Product A' }, { id: 2, name: 'Product B' }];
            // Simular la respuesta del modelo Product
            Product.findAll.mockResolvedValue(mockProducts);

            // Llamar al método que se esta probando
            const result = await ProductService.getAllProducts();

            // Verifir que el método findAll fue llamado correctamente
            expect(Product.findAll).toHaveBeenCalledTimes(1);

            // Comprobar que el resultado es el esperado
            expect(result).toEqual(mockProducts);
        });
    });

    describe('getProductById', () => {
        it('Debería devolver un producto cuando el producto existe', async () => {
            const mockProduct = { id: 1, name: 'Product A' };
            // Simular que se encuentra un producto con id 1
            Product.findByPk.mockResolvedValue(mockProduct);

            // Llamar al método que se esta probando
            const result = await ProductService.getProductById(1);

            // Verificar que el método findByPk fue llamado con el id correcto
            expect(Product.findByPk).toHaveBeenCalledWith(1);

            // Comprobar que el resultado es el esperado
            expect(result).toEqual(mockProduct);
        });

        it('Debería devolver nulo cuando el producto no existe', async () => {
            // Simular que no se encuentra un producto con id 99
            Product.findByPk.mockResolvedValue(null);

            const result = await ProductService.getProductById(99);

            // Verificar que findByPk fue llamado con el id 99
            expect(Product.findByPk).toHaveBeenCalledWith(99);

            // Comprobar que el resultado es null
            expect(result).toBeNull();
        });
    });

    describe('createProduct', () => {
        it('Debería crear un producto cuando exista categoría', async () => {
            const mockCategory = { id: 1, name: 'Category A' };
            const mockProduct = { id: 1, name: 'Product A', categoryId: 1 };

            // Simular que la categoría existe en la base de datos
            Category.findByPk.mockResolvedValue(mockCategory);

            // Simular la creación del producto
            Product.create.mockResolvedValue(mockProduct);

            // Llamar al método para crear el producto
            const result = await ProductService.createProduct(mockProduct);

            // Verificar que se haya llamado a la búsqueda de la categoría
            expect(Category.findByPk).toHaveBeenCalledWith(1);

            // Verificar que se haya llamado al método de creación de producto
            expect(Product.create).toHaveBeenCalledWith(mockProduct);

            // Comprobar que el resultado es el esperado
            expect(result).toEqual(mockProduct);
        });

        it('Debería lanzar un error cuando la categoría no existe', async () => {
            // Simular que no se encuentra la categoría
            Category.findByPk.mockResolvedValue(null);

            // Verificar que se lance un error si no existe la categoría
            await expect(ProductService.createProduct({ categoryId: 99 }))
                .rejects
                .toThrow('Category with id 99 does not exist');

            // Verificar que no se haya llamado a crear el producto
            expect(Product.create).not.toHaveBeenCalled();
        });
        
        //***** PARA MEJORAR COBERTURAS *****//
        it('Debería lanzar un error si la creación del producto falla', async () => {
            const mockCategory = { id: 1, name: 'Category A' };
            const mockProduct = { id: 1, name: 'Product A', categoryId: 1 };

            // Simular que la categoría existe pero ocurre un error al crear el producto
            Category.findByPk.mockResolvedValue(mockCategory);
            Product.create.mockRejectedValue(new Error('Database error'));

            // Verificar que se lance un error
            await expect(ProductService.createProduct(mockProduct))
                .rejects
                .toThrow('Database error');

            expect(Category.findByPk).toHaveBeenCalledWith(1);
            expect(Product.create).toHaveBeenCalledWith(mockProduct);
        });
    });

    describe('getProductsByCategory', () => {
        it('Debería devolver productos por categoría', async () => {
            const mockProducts = [{ id: 1, name: 'Product A', categoryId: 1 }];

            // Simular que la base de datos devuelve productos para una categoría
            Product.findAll.mockResolvedValue(mockProducts);

            const result = await ProductService.getProductsByCategory(1);

            // Verificar que se haya llamado al método con la categoría correcta
            expect(Product.findAll).toHaveBeenCalledWith({
                where: { categoryId: 1 },
                include: Category,
            });
            expect(result).toEqual(mockProducts);
        });

        //***** PARA MEJORAR COBERTURAS *****/ 
        it('Debería devolver los productos ordenados por precio en orden descendente', async () => {
            // Mocking del método findall del modelo de producto
            Product.findAll.mockResolvedValue([{ id: 1, name: 'Product 1' }, { id: 2, name: 'Product 2' }]);
        
            const result = await ProductService.getProductsByCategory(1, { sort: 'price,DESC' });
        
            expect(result).toBeDefined();
            expect(Product.findAll).toHaveBeenCalledWith({
                where: { categoryId: 1 },
                include: Category,
                order: [['price', 'DESC']]
            });
        });

        it('Debería devolver productos paginados', async () => {
            // Mocking del método findall del modelo de producto
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

        it('Debería devolver los productos ordenados por precio en orden predeterminado (ASC)', async () => {
            const mockCategory = { id: 1, name: 'Electronics' };
            const mockProducts = [
                { id: 1, name: 'Product A', price: 10, categoryId: 1 },
                { id: 2, name: 'Product B', price: 20, categoryId: 1 },
            ];
    
            Category.findByPk = jest.fn().mockResolvedValue(mockCategory);
            Product.findAll = jest.fn().mockResolvedValue(mockProducts);
    
            const sort = 'price'; // Ordenar por precio, predeterminado a ASC
            const options = { sort };
    
            const result = await ProductService.getProductsByCategory(1, options);
    
            expect(result).toEqual(mockProducts);
            expect(Product.findAll).toHaveBeenCalledWith({
                where: { categoryId: 1 },
                include: Category,
                order: [['price', 'ASC']], // Predeterminado a ASC si no se proporciona dirección
            });
        });
        
    });

    describe('getProductsByCategories', () => {
        it('Debería devolver productos por categorías', async () => {
            const mockProducts = [
                { id: 1, name: 'Product A', categoryId: 1 },
                { id: 2, name: 'Product B', categoryId: 2 },
            ];

            // Simular que la base de datos devuelve productos para varias categorías
            Product.findAll.mockResolvedValue(mockProducts);

            const result = await ProductService.getProductsByCategories('1,2');

            // Verificar que se haya llamado al método con las categorías correctas
            expect(Product.findAll).toHaveBeenCalledWith({
                where: { categoryId: { [Op.in]: [1, 2] } },
                include: Category
            });

            expect(result).toEqual(mockProducts);
        });

        it('Debería lanzar un error si falta el parámetro de categorías', async () => {

            // Verificar que se lance un error si el parámetro de categorías está vacío
            await expect(ProductService.getProductsByCategories('')).rejects.toThrow('Categories parameter is required');

            expect(Product.findAll).not.toHaveBeenCalled();
        });

        //***** PARA MEJORAR COBERTURAS *****/ 
        it('Debería lanzar un error cuando el parámetro de categorías está vacío', async () => {
            await expect(ProductService.getProductsByCategories('')).rejects.toThrow('Categories parameter is required');
        });
      
        it('Debería devolver productos por múltiples categorías', async () => {
            // Mocking del modelo de producto del método findall
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
      
        it('Debería devolver productos paginados con límite y desplazamiento', async () => {
            // Mocking del modelo de producto del método findall
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


        it('Debería ordenar los productos correctamente con el parámetro ordenamiento', async () => {
            const mockCategory = { id: 1, name: 'Electronics' };
            const mockProducts = [
                { id: 1, name: 'Product A', price: 10, categoryId: 1 },
                { id: 2, name: 'Product B', price: 20, categoryId: 1 },
            ];
    
            Category.findByPk = jest.fn().mockResolvedValue(mockCategory);
            Product.findAll = jest.fn().mockResolvedValue(mockProducts);
    
            const sort = 'price,DESC'; // Ordenar por precio, descendiente
            const options = { sort };
    
            const result = await ProductService.getProductsByCategories('1,2', options);
    
            expect(result).toEqual(mockProducts);
            expect(Product.findAll).toHaveBeenCalledWith({
                where: {
                    categoryId: { [Op.in]: [1, 2] },
                },
                include: Category,
                order: [['price', 'DESC']], // Verificar que se orden en DESC correcctamente
            });
        });
    
        it('Debería devolver los productos ordenados de manera predeterminada (ASC)', async () => {
            const mockCategory = { id: 1, name: 'Electronics' };
            const mockProducts = [
                { id: 1, name: 'Product A', price: 10, categoryId: 1 },
                { id: 2, name: 'Product B', price: 20, categoryId: 1 },
            ];
    
            Category.findByPk = jest.fn().mockResolvedValue(mockCategory);
            Product.findAll = jest.fn().mockResolvedValue(mockProducts);
    
            const sort = 'price'; // Ordenar por precio, predeterminado a ASC
            const options = { sort };
    
            const result = await ProductService.getProductsByCategories('1,2', options);
    
            expect(result).toEqual(mockProducts);
            expect(Product.findAll).toHaveBeenCalledWith({
                where: {
                    categoryId: { [Op.in]: [1, 2] },
                },
                include: Category,
                order: [['price', 'ASC']], // Predeterminado ASC si no se proporciona dirección
            });
        });
    
    });

    describe('updateProduct', () => {
        it('Debería actualizar un producto', async () => {
            const mockProduct = { id: 1, name: 'Updated Product' };

            // Simular que la categoría existe en la base de datos
            Category.findByPk.mockResolvedValue({ id: 1, name: 'Category A' });

            // Simular que el producto se actualiza correctamente
            Product.update.mockResolvedValue([1]); // Simular que una fila fue actualizada

            const result = await ProductService.updateProduct(1, mockProduct);

            // Verificar que se haya llamado al método update con el producto actualizado
            expect(Product.update).toHaveBeenCalledWith(mockProduct, { where: { id: 1 } });
            expect(result).toEqual([1]);
        });

        it('Debería lanzar un error si la categoría no existe al actualizar', async () => {
            // Simular que la categoría no existe
            Category.findByPk.mockResolvedValue(null); // Retorna null para simular que no existe la categoría
    
            const productData = { categoryId: 9999 }; // categoría inexistente
            const productId = 1; // ID de producto de ejemplo
    
            // Espera que se lance el error
            await expect(ProductService.updateProduct(productId, productData))
                .rejects
                .toThrow('Category with id 9999 does not exist');
    
            // Verificar que no se haya llamado a actualizar el producto
            expect(Product.update).not.toHaveBeenCalled();
        });

        it('Debería actualizar el producto si no se proporciona categoryID', async () => {
            Product.update.mockResolvedValue([1]);
    
            const productData = { name: 'New Product Name' };
            const result = await ProductService.updateProduct(1, productData);
    
            expect(result).toEqual([1]);
        });
        
    });

    describe('deleteProduct', () => {
        it('Debería eliminar un producto', async () => {
            // Simular que el producto fue eliminado correctamente
            Product.destroy.mockResolvedValue(1); // Simular que una fila fue eliminada

            const result = await ProductService.deleteProduct(1);

            // Verificar que se haya llamado al método destroy con el id correcto
            expect(Product.destroy).toHaveBeenCalledWith({ where: { id: 1 } });
            expect(result).toBe(1);
        });
 
        it('Debería devolver 0 si no se elimina ningún producto', async () => {
             // Simular que no se eliminó ningún producto
             Product.destroy.mockResolvedValue(0);
 
             const result = await ProductService.deleteProduct(99);
 
             // Verificar que se haya llamado al método destroy con el id correcto
             expect(Product.destroy).toHaveBeenCalledWith({ where: { id: 99 } });
             expect(result).toBe(0);
        });
        
    });
    
});
