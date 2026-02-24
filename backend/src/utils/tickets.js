import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { sendTicketEmail as sendTicketEmailInternal } from './emailService.js';

export const generateTicketId = () => uuidv4();

export const generateQrDataUrl = async (payload) => QRCode.toDataURL(JSON.stringify(payload));

export const sendTicketEmail = sendTicketEmailInternal;
