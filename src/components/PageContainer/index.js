import React from 'react';
import PropTypes from 'prop-types';
import { useTransition, animated, config } from 'react-spring';
import styled from 'styled-components';

/**
 * Animates the lightbox as it opens/closes
 *
 * @param {ReactNode} children All child components of Lightbox
 * @param {boolean} isOpen Flag that dictates if the lightbox is open or closed
 * @param {string} className Classes are applied to the root lightbox component
 * @param {object} style Inline styles are applied to the root lightbox component
 * @param {object} pageTransitionConfig React-Spring useTransition config for page open/close animation
 *
 * @see https://www.react-spring.io/docs/hooks/use-transition
 */
const PageContainer = ({
    children,
    isOpen,
    className,
    style,
    pageTransitionConfig
}) => {
    const defaultTransition = {
        from: { transform: 'scale(0.75)', opacity: 0 },
        enter: { transform: 'scale(1)', opacity: 1 },
        leave: { transform: 'scale(0.75)', opacity: 0 },
        config: { ...config.default, mass: 1, tension: 320, friction: 32 }
    };

    const transitions = useTransition(isOpen, {
        ...defaultTransition,
        ...pageTransitionConfig
    });

    return transitions.map(
        ({ item, key, props }) =>
            item && (
                <AnimatedPageContainer
                    key={key}
                    className={`lightbox-container${
                        className ? ` ${className}` : ''
                    }`}
                    style={{ ...props, ...style }}
                >
                    {children}
                </AnimatedPageContainer>
            )
    );
};

PageContainer.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    children: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.element),
        PropTypes.element
    ]).isRequired,
    className: PropTypes.string,
    style: PropTypes.object,
    pageTransitionConfig: PropTypes.object
};

export default PageContainer;

const AnimatedPageContainer = styled(animated.div)`
    display: flex;
    flex-direction: column;
    position: fixed;
    z-index: 400;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
`;
