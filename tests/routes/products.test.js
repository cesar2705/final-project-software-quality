const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { initTestDb, closeTestDb } = require('../setup/testDb');
const productRouter = require('../../routes/products');
const ProductService = require('../../services/productService');
const Product = require('../../models/product');
const Category = require('../../models/category');

// Crear una instancia de la aplicación Express
const app = express();
app.use(bodyParser.json());
app.use('/api/products', productRouter);

// Mock de ProductService
jest.mock('../../services/productService');

describe('Product Routes', () => {
  // Configuración de la base de datos antes de las pruebas
  beforeAll(async () => {
    await initTestDb();
  });

  // Cierre de la base de datos después de las pruebas
  afterAll(async () => {
    await closeTestDb();
  });

  // Limpiar las tablas de Product y Category antes de cada prueba
  beforeEach(async () => {
    await Product.destroy({ where: {} });
    await Category.destroy({ where: {} });
  });

  describe('POST /api/products', () => {
    it('Debería crear un nuevo producto', async () => {
      // Datos del producto mockeado
      const mockProduct = { id: 1, name: 'Product 1', price: 100, categoryId: 1 };

      // Simular que ProductService crea un producto
      ProductService.createProduct.mockResolvedValue(mockProduct);

      // Enviar la solicitud POST para crear un producto
      const response = await request(app)
        .post('/api/products')
        .send(mockProduct);

      // Asegurar de que el código de estado sea 201 y la respuesta sea el producto
      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockProduct);
      expect(ProductService.createProduct).toHaveBeenCalledWith(mockProduct);
    });

    it('Debería retornar un error cuando la categoría no exista', async () => {
      // Simular un error cuando ProductService falla
      ProductService.createProduct.mockRejectedValue(new Error('Category does not exist'));

      // Enviar la solicitud POST
      const response = await request(app)
        .post('/api/products')
        .send({ name: 'Product 1', price: 100, categoryId: 999 });

      // Asegurar de que el código de estado sea 400 y el mensaje de error sea el adecuado
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Category does not exist' });
    });

    it('Debería retornar error si faltan campos requeridos', async () => {
      // Intentar crear un producto sin un campo obligatorio
      const invalidProduct = { name: 'Product 1', price: 100 }; // Falta 'categoryId'

      const response = await request(app)
        .post('/api/products')
        .send(invalidProduct);
      
      // Verificar que la respuesta tenga el código de error 400 y el mensaje adecuado
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Category does not exist' });
    });

    it('Debería retornar error si los datos son incorrectos', async () => {
      // Intentar crear un producto con un precio incorrecto (negativo)
      const invalidProduct = { name: 'Product 1', price: -100, categoryId: 1 };

      const response = await request(app)
        .post('/api/products')
        .send(invalidProduct);

      // Verificar que la respuesta tenga el código de error 400 y el mensaje adecuado
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Category does not exist' });
    });

  });

  describe('GET /api/products/category/:categoryId', () => {
    it('Debería retornar los productos de una categoría', async () => {
      // Datos mockeados de productos
      const mockProducts = [
        { id: 1, name: 'Product 1', categoryId: 1 },
        { id: 2, name: 'Product 2', categoryId: 1 },
      ];

      // Simular que ProductService obtiene los productos por categoría
      ProductService.getProductsByCategory.mockResolvedValue(mockProducts);

      // Enviar la solicitud GET para obtener los productos de una categoría
      const response = await request(app).get('/api/products/category/1');

      // Asegurar de que el código de estado sea 200 y los productos sean los esperados
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProducts);
      expect(ProductService.getProductsByCategory).toHaveBeenCalledWith('1', expect.any(Object));
    });

    it('Debería retornar un error si ocurre un fallo al obtener los productos de la categoría', async () => {
      // Simular un error al obtener los productos
      ProductService.getProductsByCategory.mockRejectedValue(new Error('Failed to get products'));

      // Enviar la solicitud GET
      const response = await request(app).get('/api/products/category/1');

      // Asegurar de que el código de estado sea 400 y el mensaje de error sea el adecuado
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Failed to get products' });
    });

    it('Debería retornar un mensaje de error si no existen productos en la categoría', async () => {
      // Simular que no hay productos en la categoría con ID '1'
      ProductService.getProductsByCategory.mockResolvedValue([]);

      const response = await request(app).get('/api/products/category/1');

      // Verificar que la respuesta sea un array vacío, indicando que no hay productos
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);  // Debería retornar un array vacío
    });

    it('Debería retornar productos con paginación correcta', async () => {
      const mockProducts = [
        { id: 1, name: 'Producto 1', categoryId: 1 },
        { id: 2, name: 'Producto 2', categoryId: 1 },
      ];
    
      // Simular la respuesta de ProductService
      ProductService.getProductsByCategory = jest.fn().mockResolvedValue(mockProducts);
    
      // Realizar la solicitud GET con parámetros de paginación
      const response = await request(app)
        .get('/api/products/category/1')
        .query({ limit: 2, offset: 0, sort: 'name' });  // Pasar los parámetros correctos
    
      // Verificar que el estado de la respuesta sea 200
      expect(response.status).toBe(200);
    
      // Verificar que la respuesta tenga los productos correctos
      expect(response.body).toEqual(mockProducts);
    
      // Verificar que ProductService haya sido llamado con los parámetros de paginación correctos
      expect(ProductService.getProductsByCategory).toHaveBeenCalledWith('1', { limit: '2', offset: '0', sort: 'name' });
    });

  });

  describe('GET /api/products', () => {
    it('Debería retornar todos los productos', async () => {
      // Crear productos mockeados para la prueba
      const mockProducts = [
        { id: 1, name: 'Producto 1', price: 100, categoryId: 1 },
        { id: 2, name: 'Producto 2', price: 200, categoryId: 1 },
      ];

      // Simular que ProductService obtiene todos los productos
      ProductService.getAllProducts.mockResolvedValue(mockProducts);

      const response = await request(app).get('/api/products');

      // Verificar que la respuesta tenga el código de éxito 200 y los productos correctos
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProducts);
    });

    it('Debería retornar un error si ocurre un fallo al obtener productos', async () => {
      // Simular un error al obtener todos los productos
      ProductService.getAllProducts.mockRejectedValue(new Error('Fallo al obtener productos'));

      const response = await request(app).get('/api/products');

      // Verificar que se retorne un error con el código de estado 500
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Fallo al obtener productos' });
    });
  });

  describe('GET /api/products/categories', () => {
    it('Debería retornar productos por múltiples categorías', async () => {
      const mockProducts = [
        { id: 1, name: 'Producto 1', categoryId: 1 },
        { id: 2, name: 'Producto 2', categoryId: 2 },
        { id: 3, name: 'Producto 3', categoryId: 3 },
      ];
    
      // Simular la respuesta de ProductService
      ProductService.getProductsByCategories = jest.fn().mockResolvedValue(mockProducts);
    
      // Realizar la solicitud GET con las categorías en la consulta
      const response = await request(app)
        .get('/api/products/categories')
        .query({ categories: '1,2,3', limit: 3, offset: 0, sort: 'name' });
    
      // Verificar que el estado de la respuesta sea 200
      expect(response.status).toBe(200);
    
      // Verificar que la respuesta tenga los productos correctos
      expect(response.body).toEqual(mockProducts);
    
      // Verificar que ProductService haya sido llamado con los parámetros correctos
      expect(ProductService.getProductsByCategories).toHaveBeenCalledWith(
        '1,2,3',
        { limit: '3', offset: '0', sort: 'name' }
      );
    });

    it('Debería retornar error si ProductService falla al obtener productos', async () => {
      // Simular un error en ProductService
      ProductService.getProductsByCategories = jest.fn().mockRejectedValue(new Error('Error al obtener productos'));
    
      const response = await request(app)
        .get('/api/products/categories')
        .query({ categories: '1,2,3', limit: 3, offset: 0, sort: 'name' });
    
      // Verificar que el estado de la respuesta sea 400 (Bad Request)
      expect(response.status).toBe(400);
    
      // Verificar que el mensaje de error sea el esperado
      expect(response.body.error).toBe('Error al obtener productos');
    });
  });

});