import { ComponentReturn } from '../integration';
import { BindInvokableKeyword } from './-bind-invokable';

export type ComponentKeyword = BindInvokableKeyword<0, ComponentReturn<any, any>>;
