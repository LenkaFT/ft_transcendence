import { Controller } from '@nestjs/common';
import { MessageService } from '../services/message.service';

@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

    
}
