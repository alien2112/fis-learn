'use client';

import dynamic from 'next/dynamic';
import React, { ComponentType } from 'react';
import { CodeEditorProps } from './LiveCodeEditor';

const LoadingFallback = () => (
  <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
    <span className="text-gray-500">Loading editor...</span>
  </div>
);

export const LiveCodeEditor = dynamic(
  () => import('./LiveCodeEditor').then((mod) => mod.LiveCodeEditor as ComponentType<CodeEditorProps>),
  {
    ssr: false,
    loading: LoadingFallback,
  },
);
