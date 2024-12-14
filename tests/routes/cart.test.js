const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { initTestDb, closeTestDb } = require('../setup/testDb');
const cartRouter = require('../../routes/cart');
const Cart = require('../../models/cart');
const Product = require('../../models/product');
const Category = require('../../models/category');

const app = express();
app.use(bodyParser.json());
app.use('/api/carts', cartRouter);

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

  describe('POST /api/carts/:userId', () => {
    // Prueba para verificar que un carrito se crea correctamente
    it('debería crear un nuevo carrito', async () => {
      const userId = '0527';
      const res = await request(app)
        .post(`/api/carts/${userId}`)
        .expect(201);
      
      // Verifica que el carrito se haya creado con el userId y que tiene un id asignado
      expect(res.body).toHaveProperty('userId', userId);
      expect(res.body).toHaveProperty('id');
    });    
  });

  describe('POST /api/carts/:cartId/items', () => {
    let cart, product;

    beforeEach(async () => {
      const category = await Category.create({ name: 'Test Category' });
      product = await Product.create({
        name: 'Test Product',
        price: 100,
        inventory: 10,
        categoryId: category.id
      });
      cart = await Cart.create({ userId: '1' });
    });

    // Prueba para agregar un producto al carrito
    it('debería agregar un artículo al carrito', async () => {
      // Envia una solicitud POST para agregar un artículo al carrito
      const res = await request(app)
        .post(`/api/carts/${cart.id}/items`) // URL con el id del carrito
        .send({
          productId: product.id, // Envia el id del producto a agregar
          quantity: 1 // Cantidad a agregar
        })
        .expect(201); // Espera una respuesta con estado 201 (Creado)

      // Verifica que el artículo se haya agregado al carrito
      expect(res.body).toHaveProperty('productId', product.id); // Verifica que el id del producto esté en la respuesta
      expect(res.body).toHaveProperty('quantity', 1); // Verifica que la cantidad es la correcta
    });

    it('debería devolver un error si falta productId o quantity', async () => {
      const res = await request(app)
        .post('/api/carts/1/items')
        .send({ quantity: 2 }) // Falta productId
        .expect(400);
      
      expect(res.body).toHaveProperty('error', 'Product not found');
    });

    it('debería devolver un error si el cartId es inválido', async () => {
      const res = await request(app)
        .post('/api/carts/ /items')
        .send({ productId: 'prod123', quantity: 2 })
        .expect(400);
  
      expect(res.body).toHaveProperty('error', 'Product not found');
    });

  });

  describe('GET /api/carts/:cartId/items', () => {
    // Prueba para obtener los artículos del carrito con sus totales
    it('debería retornar los artículos del carrito con totales', async () => {
    
      // Crea una categoría y un producto para agregarlo al carrito
      const category = await Category.create({ name: 'Test Category' });
      const product = await Product.create({
        name: 'Test Product',
        price: 100,
        taxRate: 0.1, // Asegúrate de que el producto tenga un 'taxRate'
        inventory: 10,
        categoryId: category.id
      });

      const cart = await Cart.create({ userId: '1' });

      // Agrega un artículo al carrito
      await request(app)
        .post(`/api/carts/${cart.id}/items`)
        .send({ productId: product.id, quantity: 2 });

      // Realiza la solicitud GET para obtener los artículos del carrito
      const res = await request(app)
        .get(`/api/carts/${cart.id}/items`) // URL para obtener los artículos del carrito
        .expect(200); // Espera una respuesta con estado 200 (OK)

      // Verifica que el objeto devuelto tenga la propiedad 'items' con al menos un artículo
      expect(res.body.items.length).toBe(1); // Verifica que hay un artículo en el carrito
      expect(res.body.items[0]).toHaveProperty('productId', product.id); // Verifica que el id del producto es correcto
      expect(res.body.items[0]).toHaveProperty('itemSubtotal'); // Verifica que se ha calculado el subtotal para el artículo
      expect(res.body.items[0].itemSubtotal).toBe(200); // Verifica que el subtotal es correcto (100 * 2)

      expect(res.body.items[0]).toHaveProperty('itemTax'); // Verifica que se ha calculado el impuesto para el artículo
      expect(res.body.items[0].itemTax).toBe(20); // Verifica que el impuesto es correcto (200 * 10%)

      // Verifica que los valores de resumen estén calculados correctamente
      expect(res.body.summary).toHaveProperty('subtotal');
      expect(res.body.summary).toHaveProperty('totalTax');
      expect(res.body.summary).toHaveProperty('total');
      expect(res.body.summary.total).toBe(220); // Verifica el total del carrito (se supone que es el mismo valor del artículo en este caso)
    });

    /* it('debería devolver un error si el cartId no existe', async () => {
      const res = await request(app)
        .get('/api/carts/999/items')
        .expect(400);
  
      expect(res.body).toHaveProperty('error', 'Carrito no encontrado');
    });
 */
    
  });


  

});