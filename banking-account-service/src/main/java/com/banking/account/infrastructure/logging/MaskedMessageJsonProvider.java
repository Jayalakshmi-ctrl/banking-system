package com.banking.account.infrastructure.logging;

import ch.qos.logback.classic.spi.ILoggingEvent;
import com.fasterxml.jackson.core.JsonGenerator;
import java.io.IOException;
import net.logstash.logback.composite.JsonWritingUtils;
import net.logstash.logback.composite.loggingevent.MessageJsonProvider;

public class MaskedMessageJsonProvider extends MessageJsonProvider {

    @Override
    public void writeTo(JsonGenerator generator, ILoggingEvent event) throws IOException {
        JsonWritingUtils.writeStringField(generator, getFieldName(), PiiMaskUtil.mask(event.getFormattedMessage()));
    }
}
