const request = require('supertest');  
const express = require('express');  
const cartRouter = require('../../routes/cart');  
const CartService = require('../../services/cartService');  

const bodyParser = require('body-parser');  
const { initTestDb, closeTestDb } = require('../setup/testDb');  
const Cart = require('../../models/cart');  
const Product = require('../../models/product');  
const Category = require('../../models/category');  

const app = express();  
app.use(express.json());  
app.use('/api/carts', cartRouter);  

// Mock de CartService para simular el comportamiento del servicio en las pruebas
jest.mock('../../services/cartService');

describe('Cart Routes', () => {
  // Inicialización de la base de datos de prueba antes de ejecutar las pruebas
  beforeAll(async () => {
    await initTestDb();
  });

  // Cierre de la base de datos de prueba después de ejecutar todas las pruebas
  afterAll(async () => {
    await closeTestDb();
  });

  // Limpieza de datos de prueba antes de cada prueba
  beforeEach(async () => {
    await Cart.destroy({ where: {} });
    await Product.destroy({ where: {} });
    await Category.destroy({ where: {} });
  });

  // Limpiar los mocks después de cada prueba
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/carts/:userId', () => {

    it('Debería crear un carrito para el usuario', async () => {
      const mockCart = { id: 'cart123', userId: 'user1' };  // Mock de un carrito
      CartService.createCart.mockResolvedValue(mockCart);  // Respuesta exitosa del servicio simulada

      const response = await request(app).post('/api/carts/user1');  // Realiza una solicitud POST

      // Verificar que la respuesta sea correcta
      expect(response.status).toBe(201);  // Código de estado 201 para creación exitosa
      expect(response.body).toEqual(mockCart);  // El cuerpo de la respuesta debe ser el carrito creado
      expect(CartService.createCart).toHaveBeenCalledWith('user1');  // Verificar que el servicio fue llamado correctamente
    });

    it('Debería devolver 400 si ocurre un error', async () => {
      CartService.createCart.mockRejectedValue(new Error('Error al crear el carrito'));  // Error simulado en el servicio

      const response = await request(app).post('/api/carts/user1');  // Realiza la solicitud POST

      // Verificar que se maneje correctamente el error
      expect(response.status).toBe(400);  // Código de estado 400 para error
      expect(response.body).toEqual({ error: 'Error al crear el carrito' });  // El cuerpo debe contener el mensaje de error
    });
  });

  describe('POST /api/carts/:cartId/items', () => {

    it('Debería añadir un artículo al carrito', async () => {
      const mockCartItem = { id: 'item1', productId: 'product1', quantity: 2 };  // Mock de un artículo en el carrito
      CartService.addItemToCart.mockResolvedValue(mockCartItem);  // Respuesta simulada exitosa del servicio

      const response = await request(app)
        .post('/api/carts/cart123/items')  // Realizar una solicitud POST
        .send({ productId: 'product1', quantity: 2 });  // Enviar los datos del artículo

      // Verificar que la respuesta sea correcta
      expect(response.status).toBe(201);  
      expect(response.body).toEqual(mockCartItem);  // El cuerpo de la respuesta debe ser el artículo añadido
      expect(CartService.addItemToCart).toHaveBeenCalledWith('cart123', 'product1', 2);  // Verificar que el servicio fue llamado correctamente
    });

    it('Debería devolver 400 si ocurre un error', async () => {
      CartService.addItemToCart.mockRejectedValue(new Error('Error al añadir el artículo'));  // Error simulado en el servicio

      const response = await request(app)
        .post('/api/carts/cart123/items')  // Realizar la solicitud POST
        .send({ productId: 'product1', quantity: 2 });  // Enviar los datos del artículo

      // Verificar que se maneje correctamente el error
      expect(response.status).toBe(400);  // Código de estado 400 para error
      expect(response.body).toEqual({ error: 'Error al añadir el artículo' });  // El cuerpo debe contener el mensaje de error
    });
  });


  describe('GET /api/carts/:cartId/items', () => {

    it('Debería obtener todos los artículos del carrito', async () => {
      // Mock de artículos en el carrito
      const mockItems = [  
        { id: 'item1', productId: 'product1', quantity: 2 },
        { id: 'item2', productId: 'product2', quantity: 1 },
      ];
      CartService.getCartItems.mockResolvedValue(mockItems);  // Simula la respuesta exitosa del servicio

      const response = await request(app).get('/api/carts/cart123/items');  // Realiza la solicitud GET

      // Verificar que la respuesta sea correcta
      expect(response.status).toBe(200);  // Código de estado 200 para éxito
      expect(response.body).toEqual(mockItems);  // Lista de artículos en la respuesta
      expect(CartService.getCartItems).toHaveBeenCalledWith('cart123');  // Verificar que el servicio fue llamado correctamente
    });

    it('Debería devolver 400 si ocurre un error', async () => {
      CartService.getCartItems.mockRejectedValue(new Error('Error al obtener los artículos'));  // Simula un error en el servicio

      const response = await request(app).get('/api/carts/cart123/items');  // Realizar la solicitud GET

      // Verificar que se maneje correctamente el error
      expect(response.status).toBe(400);  // Código de estado 400 para error
      expect(response.body).toEqual({ error: 'Error al obtener los artículos' });  // El cuerpo debe contener el mensaje de error
    });
  });

  describe('PUT /api/carts/:cartId/items/:itemId', () => {

    it('Debería actualizar la cantidad de un artículo en el carrito', async () => {
      const mockCartItem = { id: 'item1', productId: 'product1', quantity: 3 };  // Mock del artículo con cantidad actualizada
      CartService.updateCartItem.mockResolvedValue(mockCartItem);  // Simula la respuesta exitosa del servicio

      const response = await request(app)
        .put('/api/carts/cart123/items/item1')  // Realizar la solicitud PUT
        .send({ quantity: 3 });  // Enviar la nueva cantidad

      // Verificar que la respuesta sea correcta
      expect(response.status).toBe(200);  // Código de estado 200 para éxito
      expect(response.body).toEqual(mockCartItem);  // El cuerpo de la respuesta debe ser el artículo actualizado
      expect(CartService.updateCartItem).toHaveBeenCalledWith('item1', 3);  // Verificar que el servicio fue llamado correctamente
    });

    it('Debería devolver 400 si ocurre un error', async () => {
      CartService.updateCartItem.mockRejectedValue(new Error('Error al actualizar el artículo'));  // Simula un error en el servicio

      const response = await request(app)
        .put('/api/carts/cart123/items/item1')  // Realizar la solicitud PUT
        .send({ quantity: 3 });  // Enviar la nueva cantidad

      // Verificar que se maneje correctamente el error
      expect(response.status).toBe(400);  // Código de estado 400 para error
      expect(response.body).toEqual({ error: 'Error al actualizar el artículo' });  // El cuerpo debe contener el mensaje de error
    });
  });

  describe('DELETE /api/carts/:cartId/items/:itemId', () => {

    it('debe eliminar un artículo del carrito', async () => {
      CartService.removeCartItem.mockResolvedValue();  // Simula la respuesta exitosa del servicio

      const response = await request(app).delete('/api/carts/cart123/items/item1');  // Realizar la solicitud DELETE

      // Verificar que la respuesta sea correcta
      expect(response.status).toBe(204);  // Código de estado 204 para eliminación exitosa
      expect(CartService.removeCartItem).toHaveBeenCalledWith('item1');  // Verificar que el servicio fue llamado correctamente
    });

    it('Debería devolver 400 si ocurre un error', async () => {
      CartService.removeCartItem.mockRejectedValue(new Error('Error al eliminar el artículo'));  // Simula un error en el servicio

      const response = await request(app).delete('/api/carts/cart123/items/item1');  // Realizar la solicitud DELETE

      // Verificar que se maneje correctamente el error
      expect(response.status).toBe(400);  // Código de estado 400 para error
      expect(response.body).toEqual({ error: 'Error al eliminar el artículo' });  // El cuerpo debe contener el mensaje de error
    });
  });

});