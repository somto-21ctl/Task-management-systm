import { AppController } from './app.controller';

describe('AppController', () => {
  it('reports a healthy service', () => {
    expect(new AppController().check()).toEqual({ status: 'ok' });
  });
});
