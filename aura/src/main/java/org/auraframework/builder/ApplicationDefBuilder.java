/*
 * Copyright (C) 2013 salesforce.com, inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.auraframework.builder;

import org.auraframework.def.ApplicationDef;
import org.auraframework.def.DefDescriptor;
import org.auraframework.def.LayoutsDef;
import org.auraframework.def.ThemeDef;

/**
 */
public interface ApplicationDefBuilder extends BaseComponentDefBuilder<ApplicationDef> {

    ApplicationDefBuilder setLayouts(LayoutsDef layouts);

    /**
     * Specifies the {@link ThemeDef} to use as the override theme. Vars specified in the override theme take precedence
     * over default var values within the whole application.
     */
    ApplicationDefBuilder setOverrideThemeDescriptor(DefDescriptor<ThemeDef> overrideThemeDescriptor);
}
