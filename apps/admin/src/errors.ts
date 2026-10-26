export function errorText(error: any) {
  if (
    error?.code === 'over_email_send_rate_limit' ||
    /email rate limit exceeded/i.test(error?.message || '')
  )
    return '邮件发送已达到平台限额，请等待额度恢复后再试。不要重复发送；若有尚未使用的最新邮件，请在原浏览器打开。';
  if (error?.code === 'over_request_rate_limit' || error?.status === 429)
    return '操作过于频繁，请稍后再试。';
  if (error?.code === 'PT409' || error?.status === 409)
    return '资料已被其他操作修改，本次未覆盖。请保留当前修改并重新载入核对。';
  if (error?.code === '42501') return '当前账号无权执行此操作。请确认账号仍为有效后台成员。';
  if (error?.code === '23505') return '名称、编号或关联已经存在，请检查重复资料。';
  if (error?.code === '23503')
    return '仍有关联资料，或关联对象无效。请先调整对应图片、方案或宗教。';
  const message = typeof error?.message === 'string' ? error.message : '';
  if (/product_images_check1/.test(message))
    return '宗教专属设计图批准公开前，请在「图片管理」填写设计名称，然后重新保存。';
  if (/product_images_check2/.test(message))
    return '图片设计名称不能只填空格，请填写名称或清空此栏后重新保存。';
  if (/product_images_check\b/.test(message))
    return '共通主图不能限定宗教，请将该图片的适用宗教改为「共通」后重新保存。';
  if (error?.code === '23514')
    return '资料未符合保存规则，请检查图片、价格和必填项目后重新保存。当前修改仍保留。';
  if (/failed to fetch|network|timeout|load failed/i.test(message))
    return '连接失败，当前修改仍保留。请检查网络后重试。';
  // Only display application messages already written in Chinese. Do not expose raw SQL/server errors.
  if (/[\u3400-\u9fff]/.test(message) && !/constraint|relation|SQL|Postgres/i.test(message))
    return message;
  return '操作失败，当前修改仍保留。请稍后重试；若仍失败，请联系管理员检查服务。';
}
