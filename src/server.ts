/**
 * Express Server
 *
 * Main entry point for the EtsyInnovations API server.
 * Mounts all API routes and serves static files.
 *
 * Production-ready for Render.com deployment.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

// Import API routers
import santaApiDeep from './api/santaApiDeep';
import plannerApi from './api/plannerApi';
import thoughtChatApi from './api/thoughtChatApi';
import referralApi from './api/referralApi';
import checkoutApi from './api/checkoutApi';
import refundApi from './api/refundApi';
import { renderRefundPage } from './pages/refund';
import supportReplyApi from './api/supportReplyApi';
import homeworkApi from './api/homeworkApi';
import analyticsApi from './api/analyticsApi';
import rediApi from './api/rediApi';
// V1/V2 archived - V3 and V5 active (OpenAI Realtime API)
import { initRediV3 } from './websocket/rediV3Server';
import { initRediV5 } from './websocket/rediV5Server';
import { initRediV6, closeRediV6 } from './websocket/rediV6Server';
import { initRediV7, closeRediV7 } from './websocket/rediV7Server';
