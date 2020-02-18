import { HandleResult, Template, TemplateOk, OkHandle, ErrHandle } from '@glimmer/interfaces';

export function unwrapHandle(handle: HandleResult): number {
  if (typeof handle === 'number') {
    return handle;
  } else {
    let error = handle.errors[0];
    throw new Error(`Compile Error: ${error.problem} @ ${error.span.start}..${error.span.end}`);
  }
}

export function unwrapTemplate<M>(template: Template<M>): TemplateOk<M> {
  if (template.result === 'error') {
    throw new Error(
      `Compile Error: ${template.problem} @ ${template.span.start}..${template.span.end}`
    );
  }

  return template;
}

export function extractHandle(handle: HandleResult): number {
  if (typeof handle === 'number') {
    return handle;
  } else {
    return handle.handle;
  }
}

export function isOkHandle(handle: HandleResult): handle is OkHandle {
  return typeof handle === 'number';
}

export function isErrHandle(handle: HandleResult): handle is ErrHandle {
  return typeof handle === 'number';
}
