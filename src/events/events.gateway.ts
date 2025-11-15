import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: ['http://localhost:1420', 'http://localhost:3000', 'http://localhost:3001', 'tauri://localhost'] }
})
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  studentLogged(payload: { id: string; name: string; at: number, exit: boolean; accepted: boolean, suspended?: boolean }) {
    this.server.emit('student:logged', payload);
  }

  studentCountCurrentlyInside(count: number) {
    this.server.emit('student:count_currently_inside', { count });
  }

  studentCountCurrentlyOutside(count: number) {
    this.server.emit('student:count_currently_outside', { count });
  }
}

